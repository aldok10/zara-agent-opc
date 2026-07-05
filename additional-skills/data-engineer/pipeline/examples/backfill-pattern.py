import logging
from datetime import date, timedelta
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class BackfillConfig:
    pipeline_id: str
    start_date: date
    end_date: date
    batch_size_days: int = 1
    max_retries: int = 3
    dry_run: bool = False


class BackfillRunner:
    def __init__(self, config: BackfillConfig, warehouse_client, source_client):
        self.config = config
        self.warehouse = warehouse_client
        self.source = source_client

    def run(self) -> dict:
        dates = self._generate_date_batches()
        results = {"success": [], "failed": [], "skipped": []}

        logger.info(
            f"Starting backfill: {self.config.start_date} -> {self.config.end_date} "
            f"({len(dates)} batches of {self.config.batch_size_days} day(s))"
        )

        for batch_start, batch_end in dates:
            if self.config.dry_run:
                logger.info(f"[DRY RUN] Would process: {batch_start} -> {batch_end}")
                results["skipped"].append((batch_start, batch_end))
                continue

            success = self._process_batch(batch_start, batch_end)
            if success:
                results["success"].append((batch_start, batch_end))
            else:
                results["failed"].append((batch_start, batch_end))
                logger.error(f"Batch failed: {batch_start} -> {batch_end}")

        self._log_summary(results)
        return results

    def _generate_date_batches(self) -> list[tuple[date, date]]:
        batches = []
        current = self.config.start_date
        while current < self.config.end_date:
            batch_end = min(
                current + timedelta(days=self.config.batch_size_days),
                self.config.end_date,
            )
            batches.append((current, batch_end))
            current = batch_end
        return batches

    def _process_batch(self, batch_start: date, batch_end: date) -> bool:
        for attempt in range(1, self.config.max_retries + 1):
            try:
                logger.info(
                    f"Processing {batch_start} -> {batch_end} (attempt {attempt})"
                )

                row_count = self._extract_and_load(batch_start, batch_end)
                self._validate_batch(batch_start, batch_end, row_count)
                self._update_state(batch_end)

                logger.info(
                    f"Completed {batch_start} -> {batch_end}: {row_count} rows"
                )
                return True

            except ValidationError as e:
                logger.error(f"Validation failed: {e}")
                self._rollback_batch(batch_start, batch_end)
                return False

            except Exception as e:
                logger.warning(
                    f"Attempt {attempt} failed for {batch_start} -> {batch_end}: {e}"
                )
                if attempt == self.config.max_retries:
                    return False

        return False

    def _extract_and_load(self, batch_start: date, batch_end: date) -> int:
        data = self.source.fetch(
            start_date=batch_start.isoformat(),
            end_date=batch_end.isoformat(),
        )

        if not data:
            logger.warning(f"No data for {batch_start} -> {batch_end}")
            return 0

        self.warehouse.execute(
            """
            DELETE FROM target_table
            WHERE partition_date >= %s AND partition_date < %s
            """,
            (batch_start, batch_end),
        )

        self.warehouse.bulk_insert("target_table", data)
        return len(data)

    def _validate_batch(self, batch_start: date, batch_end: date, row_count: int):
        if row_count == 0:
            return

        target_count = self.warehouse.query_scalar(
            """
            SELECT COUNT(*) FROM target_table
            WHERE partition_date >= %s AND partition_date < %s
            """,
            (batch_start, batch_end),
        )

        if target_count != row_count:
            raise ValidationError(
                f"Row count mismatch: loaded {row_count}, target has {target_count}"
            )

        null_keys = self.warehouse.query_scalar(
            """
            SELECT COUNT(*) FROM target_table
            WHERE partition_date >= %s AND partition_date < %s
              AND primary_key IS NULL
            """,
            (batch_start, batch_end),
        )

        if null_keys > 0:
            raise ValidationError(f"Found {null_keys} rows with NULL primary key")

    def _rollback_batch(self, batch_start: date, batch_end: date):
        logger.info(f"Rolling back {batch_start} -> {batch_end}")
        self.warehouse.execute(
            """
            DELETE FROM target_table
            WHERE partition_date >= %s AND partition_date < %s
            """,
            (batch_start, batch_end),
        )

    def _update_state(self, watermark: date):
        self.warehouse.execute(
            """
            UPDATE pipeline_state
            SET high_watermark = %s, last_run_at = NOW(), last_run_status = 'success'
            WHERE pipeline_id = %s
            """,
            (watermark.isoformat(), self.config.pipeline_id),
        )

    def _log_summary(self, results: dict):
        total = sum(len(v) for v in results.values())
        logger.info(
            f"Backfill complete: {len(results['success'])}/{total} succeeded, "
            f"{len(results['failed'])} failed, {len(results['skipped'])} skipped"
        )
        if results["failed"]:
            failed_ranges = [f"{s} -> {e}" for s, e in results["failed"]]
            logger.error(f"Failed batches: {failed_ranges}")


class ValidationError(Exception):
    pass


if __name__ == "__main__":
    config = BackfillConfig(
        pipeline_id="order_metrics",
        start_date=date(2026, 1, 1),
        end_date=date(2026, 7, 1),
        batch_size_days=7,
        dry_run=False,
    )

    runner = BackfillRunner(
        config=config,
        warehouse_client=None,
        source_client=None,
    )
    runner.run()
