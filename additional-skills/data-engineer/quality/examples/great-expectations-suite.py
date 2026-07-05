import great_expectations as gx
from great_expectations.core import ExpectationSuite


def build_orders_suite() -> ExpectationSuite:
    suite = gx.ExpectationSuite(name="orders_quality_suite")

    suite.add_expectation(
        gx.expectations.ExpectTableRowCountToBeBetween(
            min_value=100, max_value=10000000
        )
    )

    suite.add_expectation(
        gx.expectations.ExpectColumnToExist(column="order_id")
    )
    suite.add_expectation(
        gx.expectations.ExpectColumnValuesToNotBeNull(column="order_id")
    )
    suite.add_expectation(
        gx.expectations.ExpectColumnValuesToBeUnique(column="order_id")
    )

    suite.add_expectation(
        gx.expectations.ExpectColumnToExist(column="customer_id")
    )
    suite.add_expectation(
        gx.expectations.ExpectColumnValuesToNotBeNull(column="customer_id")
    )
    suite.add_expectation(
        gx.expectations.ExpectColumnValuesToMatchRegex(
            column="customer_id", regex=r"^[A-Za-z0-9\-]+$"
        )
    )

    suite.add_expectation(
        gx.expectations.ExpectColumnValuesToNotBeNull(column="amount")
    )
    suite.add_expectation(
        gx.expectations.ExpectColumnValuesToBeBetween(
            column="amount", min_value=0, max_value=999999.99
        )
    )
    suite.add_expectation(
        gx.expectations.ExpectColumnMeanToBeBetween(
            column="amount", min_value=10, max_value=5000
        )
    )

    suite.add_expectation(
        gx.expectations.ExpectColumnValuesToNotBeNull(column="status")
    )
    suite.add_expectation(
        gx.expectations.ExpectColumnValuesToBeInSet(
            column="status",
            value_set=["pending", "completed", "shipped", "cancelled", "refunded"],
        )
    )

    suite.add_expectation(
        gx.expectations.ExpectColumnValuesToNotBeNull(column="order_date")
    )
    suite.add_expectation(
        gx.expectations.ExpectColumnValuesToBeBetween(
            column="order_date",
            min_value="2020-01-01",
            max_value="2027-01-01",
        )
    )

    suite.add_expectation(
        gx.expectations.ExpectColumnValuesToNotBeNull(column="currency")
    )
    suite.add_expectation(
        gx.expectations.ExpectColumnValueLengthsToBeBetween(
            column="currency", min_value=3, max_value=3
        )
    )

    suite.add_expectation(
        gx.expectations.ExpectColumnValuesToNotBeNull(column="email")
    )
    suite.add_expectation(
        gx.expectations.ExpectColumnValuesToMatchRegex(
            column="email", regex=r"^[^@]+@[^@]+\.[^@]+$"
        )
    )

    suite.add_expectation(
        gx.expectations.ExpectColumnDistinctValuesToBeInSet(
            column="payment_method",
            value_set=["credit_card", "debit_card", "bank_transfer", "paypal", "apple_pay"],
        )
    )

    return suite


def validate_dataframe(df, suite: ExpectationSuite):
    context = gx.get_context()

    datasource = context.data_sources.add_pandas("validation_source")
    asset = datasource.add_dataframe_asset("orders")
    batch_def = asset.add_batch_definition_whole_dataframe("validate")
    batch = batch_def.get_batch(batch_parameters={"dataframe": df})

    validation_result = batch.validate(suite)

    if not validation_result.success:
        failed_expectations = [
            r for r in validation_result.results if not r.success
        ]
        for failure in failed_expectations:
            print(f"FAILED: {failure.expectation_config.type}")
            print(f"  Result: {failure.result}")
        raise ValueError(
            f"{len(failed_expectations)} expectations failed out of "
            f"{len(validation_result.results)} total"
        )

    return validation_result


if __name__ == "__main__":
    import pandas as pd

    df = pd.read_parquet("data/orders.parquet")
    suite = build_orders_suite()
    result = validate_dataframe(df, suite)
    print(f"Validation passed: {result.statistics['successful_expectations']} expectations")
