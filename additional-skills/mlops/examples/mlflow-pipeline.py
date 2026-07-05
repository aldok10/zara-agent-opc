"""
MLflow experiment tracking and model registration pipeline.
Demonstrates: parameter logging, metric tracking, artifact storage,
model registration with stage transitions.
"""
import mlflow
from mlflow.models import infer_signature
from sklearn.datasets import load_wine
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score, classification_report
import numpy as np


EXPERIMENT_NAME = "wine-classification"
MODEL_NAME = "wine-classifier"
PROMOTION_THRESHOLD = 0.90


def validate_data(X, y):
    assert X.shape[0] == y.shape[0], "Feature/label count mismatch"
    assert not np.any(np.isnan(X)), "NaN values in features"
    assert X.shape[1] == 13, f"Expected 13 features, got {X.shape[1]}"
    return True


def train_and_log():
    mlflow.set_experiment(EXPERIMENT_NAME)

    data = load_wine()
    X_train, X_test, y_train, y_test = train_test_split(
        data.data, data.target, test_size=0.2, random_state=42, stratify=data.target
    )

    validate_data(X_train, y_train)
    validate_data(X_test, y_test)

    params = {
        "n_estimators": 200,
        "max_depth": 5,
        "learning_rate": 0.1,
        "min_samples_split": 4,
        "random_state": 42,
    }

    with mlflow.start_run() as run:
        mlflow.log_params(params)
        mlflow.log_param("dataset_size", X_train.shape[0])
        mlflow.log_param("n_features", X_train.shape[1])
        mlflow.set_tag("model_type", "gradient_boosting")
        mlflow.set_tag("stage", "experiment")

        model = GradientBoostingClassifier(**params)
        model.fit(X_train, y_train)

        y_pred = model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred, average="weighted")

        mlflow.log_metric("accuracy", accuracy)
        mlflow.log_metric("f1_weighted", f1)

        report = classification_report(y_test, y_pred, target_names=data.target_names)
        mlflow.log_text(report, "classification_report.txt")

        signature = infer_signature(X_train, y_pred)
        mlflow.sklearn.log_model(
            model,
            artifact_path="model",
            signature=signature,
            input_example=X_train[:5],
        )

        print(f"Run ID: {run.info.run_id}")
        print(f"Accuracy: {accuracy:.4f}")
        print(f"F1 (weighted): {f1:.4f}")

        if f1 >= PROMOTION_THRESHOLD:
            model_uri = f"runs:/{run.info.run_id}/model"
            mv = mlflow.register_model(model_uri, MODEL_NAME)
            print(f"Registered model version: {mv.version}")

            client = mlflow.tracking.MlflowClient()
            client.set_registered_model_alias(MODEL_NAME, "champion", mv.version)
            print(f"Promoted version {mv.version} to champion")
        else:
            print(f"F1 {f1:.4f} below threshold {PROMOTION_THRESHOLD}, not registering")

    return run.info.run_id


if __name__ == "__main__":
    run_id = train_and_log()
