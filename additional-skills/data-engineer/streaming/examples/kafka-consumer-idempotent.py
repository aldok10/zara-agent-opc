import hashlib
import json
import logging
from confluent_kafka import Consumer, Producer, KafkaError
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class ProcessingResult:
    order_id: str
    status: str
    output: dict


class IdempotentOrderConsumer:
    def __init__(
        self,
        bootstrap_servers: str,
        group_id: str,
        input_topic: str,
        output_topic: str,
        db_connection,
    ):
        self.input_topic = input_topic
        self.output_topic = output_topic
        self.db = db_connection

        self.consumer = Consumer({
            "bootstrap.servers": bootstrap_servers,
            "group.id": group_id,
            "auto.offset.reset": "earliest",
            "enable.auto.commit": False,
            "max.poll.interval.ms": 300000,
            "session.timeout.ms": 45000,
            "partition.assignment.strategy": "cooperative-sticky",
            "isolation.level": "read_committed",
        })

        self.producer = Producer({
            "bootstrap.servers": bootstrap_servers,
            "enable.idempotence": True,
            "acks": "all",
            "compression.type": "zstd",
            "linger.ms": 10,
        })

    def start(self):
        self.consumer.subscribe([self.input_topic])
        logger.info(f"Subscribed to {self.input_topic}")

        try:
            while True:
                msg = self.consumer.poll(timeout=1.0)
                if msg is None:
                    continue
                if msg.error():
                    self._handle_error(msg)
                    continue

                self._process_message(msg)
        except KeyboardInterrupt:
            logger.info("Shutting down consumer")
        finally:
            self.consumer.close()

    def _process_message(self, msg):
        idempotency_key = self._compute_idempotency_key(msg)

        if self._already_processed(idempotency_key):
            logger.debug(f"Skipping duplicate: {idempotency_key}")
            self.consumer.commit(message=msg, asynchronous=False)
            return

        try:
            event = json.loads(msg.value().decode("utf-8"))
            result = self._transform(event)

            self._write_to_sink(result, idempotency_key)
            self._produce_output(result)
            self._mark_processed(idempotency_key)

            self.consumer.commit(message=msg, asynchronous=False)
            logger.info(f"Processed: {result.order_id}")

        except Exception as e:
            logger.error(f"Processing failed: {e}", exc_info=True)
            self._send_to_dlq(msg, str(e))
            self.consumer.commit(message=msg, asynchronous=False)

    def _compute_idempotency_key(self, msg) -> str:
        key_data = f"{msg.topic()}:{msg.partition()}:{msg.offset()}"
        return hashlib.sha256(key_data.encode()).hexdigest()[:32]

    def _already_processed(self, idempotency_key: str) -> bool:
        result = self.db.execute(
            "SELECT 1 FROM processed_events WHERE idempotency_key = %s",
            (idempotency_key,),
        )
        return result.fetchone() is not None

    def _mark_processed(self, idempotency_key: str):
        self.db.execute(
            "INSERT INTO processed_events (idempotency_key, processed_at) "
            "VALUES (%s, NOW()) ON CONFLICT DO NOTHING",
            (idempotency_key,),
        )
        self.db.commit()

    def _transform(self, event: dict) -> ProcessingResult:
        order_id = event["order_id"]
        enriched = {
            "order_id": order_id,
            "customer_id": event["customer_id"],
            "total_amount": event["amount"] * (1 - event.get("discount", 0) / 100),
            "currency": event.get("currency", "USD"),
            "item_count": len(event.get("items", [])),
            "processed": True,
        }
        return ProcessingResult(
            order_id=order_id,
            status="processed",
            output=enriched,
        )

    def _write_to_sink(self, result: ProcessingResult, idempotency_key: str):
        self.db.execute(
            """INSERT INTO order_summaries (order_id, total_amount, currency, item_count, idempotency_key)
               VALUES (%s, %s, %s, %s, %s)
               ON CONFLICT (order_id) DO UPDATE SET
                   total_amount = EXCLUDED.total_amount,
                   currency = EXCLUDED.currency,
                   item_count = EXCLUDED.item_count""",
            (
                result.output["order_id"],
                result.output["total_amount"],
                result.output["currency"],
                result.output["item_count"],
                idempotency_key,
            ),
        )
        self.db.commit()

    def _produce_output(self, result: ProcessingResult):
        self.producer.produce(
            topic=self.output_topic,
            key=result.order_id.encode("utf-8"),
            value=json.dumps(result.output).encode("utf-8"),
            callback=self._delivery_callback,
        )
        self.producer.flush(timeout=10)

    def _send_to_dlq(self, msg, error_reason: str):
        headers = [
            ("error_reason", error_reason.encode("utf-8")),
            ("original_topic", msg.topic().encode("utf-8")),
            ("original_partition", str(msg.partition()).encode("utf-8")),
            ("original_offset", str(msg.offset()).encode("utf-8")),
        ]
        self.producer.produce(
            topic=f"{self.input_topic}.dlq",
            key=msg.key(),
            value=msg.value(),
            headers=headers,
        )
        self.producer.flush(timeout=10)
        logger.warning(f"Sent to DLQ: {error_reason}")

    def _handle_error(self, msg):
        if msg.error().code() == KafkaError._PARTITION_EOF:
            return
        logger.error(f"Consumer error: {msg.error()}")

    @staticmethod
    def _delivery_callback(err, msg):
        if err:
            logger.error(f"Delivery failed: {err}")
        else:
            logger.debug(f"Delivered to {msg.topic()}[{msg.partition()}]@{msg.offset()}")


if __name__ == "__main__":
    import psycopg2

    conn = psycopg2.connect("postgresql://localhost/orders")
    consumer = IdempotentOrderConsumer(
        bootstrap_servers="localhost:9092",
        group_id="order-processor",
        input_topic="raw-orders",
        output_topic="processed-orders",
        db_connection=conn,
    )
    consumer.start()
