# References

## Dagster (10 refs)
- **Dagster Documentation** -- https://docs.dagster.io/ -- Official Dagster orchestration platform docs
- **Dagster Assets** -- https://docs.dagster.io/concepts/assets/software-defined-assets -- Software-defined assets guide
- **Dagster Resources** -- https://docs.dagster.io/concepts/resources -- Configurable external service connections
- **Dagster Schedules/Sensors** -- https://docs.dagster.io/concepts/automation -- Triggering pipelines on time or events
- **Dagster Partitions** -- https://docs.dagster.io/concepts/partitions-schedules-sensors/partitions -- Time and key-based data partitioning
- **Dagster IO Managers** -- https://docs.dagster.io/concepts/io-management/io-managers -- Declarative storage for asset outputs
- **Dagster Testing** -- https://docs.dagster.io/concepts/testing -- Unit and integration testing patterns
- **Dagster+ (Cloud)** -- https://docs.dagster.io/dagster-plus -- Managed Dagster hosting and observability
- **Dagster dbt Integration** -- https://docs.dagster.io/integrations/dbt -- Managing dbt models as Dagster assets
- **Dagster Pipes** -- https://docs.dagster.io/concepts/dagster-pipes -- Lightweight external process orchestration

## Apache Airflow (10 refs)
- **Airflow Documentation** -- https://airflow.apache.org/docs/ -- Official Apache Airflow reference
- **Airflow TaskFlow API** -- https://airflow.apache.org/docs/apache-airflow/stable/tutorial/taskflow.html -- Pythonic DAG authoring with decorators
- **Airflow Datasets** -- https://airflow.apache.org/docs/apache-airflow/stable/authoring-and-scheduling/datasets.html -- Data-aware scheduling triggers
- **Airflow Best Practices** -- https://airflow.apache.org/docs/apache-airflow/stable/best-practices.html -- DAG design and deployment patterns
- **Astronomer** -- https://docs.astronomer.io/ -- Managed Airflow platform and guides
- **Airflow Providers** -- https://airflow.apache.org/docs/apache-airflow-providers/ -- Integration packages for external systems
- **Airflow Dynamic DAGs** -- https://airflow.apache.org/docs/apache-airflow/stable/howto/dynamic-dag-generation.html -- Generating DAGs programmatically
- **Airflow XComs** -- https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/xcoms.html -- Inter-task communication mechanism
- **Airflow Executors** -- https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/executor/index.html -- CeleryExecutor, KubernetesExecutor
- **Airflow Testing** -- https://airflow.apache.org/docs/apache-airflow/stable/best-practices.html#testing-a-dag -- DAG validation and unit testing

## Alternative Orchestrators (10 refs)
- **Prefect** -- https://docs.prefect.io/ -- Modern Python workflow orchestration
- **Mage** -- https://docs.mage.ai/ -- Data pipeline tool with notebook interface
- **Kestra** -- https://kestra.io/docs -- Event-driven orchestration with declarative YAML
- **Temporal** -- https://docs.temporal.io/ -- Durable execution for long-running workflows
- **Hamilton** -- https://hamilton.dagworks.io/ -- Lightweight DAG framework for dataflows
- **dlt (data load tool)** -- https://dlthub.com/docs -- Python library for data loading pipelines
- **Luigi** -- https://luigi.readthedocs.io/ -- Python batch job framework by Spotify
- **Flyte** -- https://docs.flyte.org/ -- Kubernetes-native workflow orchestration for ML
- **Windmill** -- https://www.windmill.dev/docs -- Developer platform for scripts and workflows
- **n8n** -- https://docs.n8n.io/ -- Workflow automation with visual editor

## Scheduling and Backfills (10 refs)
- **Dagster Backfills** -- https://docs.dagster.io/concepts/partitions-schedules-sensors/backfills -- Re-processing historical partitions
- **Airflow Catchup** -- https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/dag-run.html#catchup -- Backfilling missed DAG runs
- **Cron Syntax** -- https://crontab.guru/ -- Interactive cron expression editor
- **Dagster Freshness Policies** -- https://docs.dagster.io/concepts/assets/asset-auto-execution -- SLA-based materialization triggers
- **Airflow Timetables** -- https://airflow.apache.org/docs/apache-airflow/stable/howto/timetable.html -- Custom scheduling logic
- **Idempotent Scheduling** -- https://docs.dagster.io/concepts/partitions-schedules-sensors/partitions#partitioned-assets -- Partition-based idempotent reruns
- **Data Intervals** -- https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/dag-run.html#data-interval -- Logical date and data boundaries
- **Event-Driven Triggers** -- https://docs.dagster.io/concepts/partitions-schedules-sensors/sensors -- Sensors for reactive scheduling
- **Retry Strategies** -- https://docs.dagster.io/concepts/ops-jobs-graphs/op-retries -- Configuring retry policies
- **SLA Monitoring** -- https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/tasks.html#slas -- Task deadline monitoring and alerting
