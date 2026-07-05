# References

## FinOps Foundation (7 refs)
- **FinOps Framework** -- https://www.finops.org/framework/ -- Operating model for cloud financial management
- **FinOps Principles** -- https://www.finops.org/framework/principles/ -- Core principles: inform, optimize, operate
- **FinOps Capabilities** -- https://www.finops.org/framework/capabilities/ -- Detailed capability areas and maturity
- **FinOps Personas** -- https://www.finops.org/framework/personas/ -- Roles and responsibilities in cloud cost management
- **FinOps Certified Practitioner** -- https://learn.finops.org/ -- Training and certification resources
- **State of FinOps** -- https://data.finops.org/ -- Annual survey data on FinOps adoption
- **FinOps for Kubernetes** -- https://www.finops.org/wg/containers-kubernetes/ -- Container cost allocation working group

## Right-Sizing (6 refs)
- **AWS Compute Optimizer** -- https://docs.aws.amazon.com/compute-optimizer/latest/ug/ -- ML-based instance right-sizing recommendations
- **Goldilocks (VPA Recommender)** -- https://github.com/FairwindsOps/goldilocks -- Kubernetes resource request recommendations
- **Vertical Pod Autoscaler** -- https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler -- Automatic resource right-sizing
- **GCP Recommender** -- https://cloud.google.com/recommender/docs/recommenders -- Machine-type and idle resource recommendations
- **Azure Advisor Cost** -- https://learn.microsoft.com/en-us/azure/advisor/advisor-cost-recommendations -- Cost optimization recommendations
- **Kubecost Sizing** -- https://docs.kubecost.com/using-kubecost/navigating-the-kubecost-ui/savings/right-size -- Container resource optimization

## Spot & Preemptible Instances (5 refs)
- **AWS Spot Instances** -- https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-spot-instances.html -- Up to 90% discount on spare EC2 capacity
- **Spot Best Practices** -- https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-best-practices.html -- Diversification, interruption handling
- **Karpenter Spot** -- https://karpenter.sh/docs/concepts/nodepools/#spec-template-spec-capacity-types -- Spot node provisioning for Kubernetes
- **GCP Spot VMs** -- https://cloud.google.com/compute/docs/instances/spot -- Preemptible instances on Google Cloud
- **Azure Spot VMs** -- https://learn.microsoft.com/en-us/azure/virtual-machines/spot-vms -- Spare Azure capacity at discount

## Savings Plans & Commitments (5 refs)
- **AWS Savings Plans** -- https://docs.aws.amazon.com/savingsplans/latest/userguide/ -- Flexible commitment-based discounts
- **AWS Reserved Instances** -- https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-reserved-instances.html -- Capacity reservation with discounts
- **GCP Committed Use** -- https://cloud.google.com/compute/docs/instances/committed-use-discounts-overview -- 1-3 year compute commitments
- **Azure Reservations** -- https://learn.microsoft.com/en-us/azure/cost-management-billing/reservations/ -- Reserved capacity pricing
- **AWS Cost Explorer Recommendations** -- https://docs.aws.amazon.com/cost-management/latest/userguide/ce-rightsizing.html -- Automated savings recommendations

## Kubernetes Cost Management (6 refs)
- **Kubecost** -- https://docs.kubecost.com/ -- Kubernetes cost monitoring and optimization
- **OpenCost** -- https://www.opencost.io/docs/ -- CNCF sandbox project for Kubernetes cost allocation
- **Cloud Billing Exports** -- https://cloud.google.com/billing/docs/how-to/export-data-bigquery -- Exporting cost data for analysis
- **AWS Container Cost Allocation** -- https://docs.aws.amazon.com/cur/latest/userguide/split-cost-allocation-data.html -- EKS pod-level cost attribution
- **Kubernetes Resource Quotas** -- https://kubernetes.io/docs/concepts/policy/resource-quotas/ -- Enforcing namespace-level cost controls
- **LimitRange** -- https://kubernetes.io/docs/concepts/policy/limit-range/ -- Default resource constraints per namespace

## Cost Visibility & Reporting (5 refs)
- **AWS Cost and Usage Report** -- https://docs.aws.amazon.com/cur/latest/userguide/ -- Detailed billing data export
- **AWS Budgets** -- https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html -- Spending alerts and forecasts
- **GCP Billing Reports** -- https://cloud.google.com/billing/docs/how-to/reports -- Cost breakdown and trend analysis
- **Azure Cost Management** -- https://learn.microsoft.com/en-us/azure/cost-management-billing/ -- Multi-cloud cost analysis
- **Infracost** -- https://www.infracost.io/docs/ -- Cost estimates for Terraform pull requests

## Waste Reduction (5 refs)
- **AWS Trusted Advisor** -- https://docs.aws.amazon.com/awssupport/latest/user/trusted-advisor.html -- Idle resources and savings identification
- **Cloud Custodian** -- https://cloudcustodian.io/docs/ -- Automated policies for unused resource cleanup
- **Kube-downscaler** -- https://codeberg.org/hjacobs/kube-downscaler -- Scale down workloads during off-hours
- **Spot.io (NetApp)** -- https://docs.spot.io/ -- Automated workload optimization platform
- **AWS Instance Scheduler** -- https://docs.aws.amazon.com/solutions/latest/instance-scheduler-on-aws/ -- Automated start/stop for non-production resources

## Architecture Optimization (4 refs)
- **AWS Well-Architected Cost Pillar** -- https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/ -- Cost-aware architecture design
- **Graviton Instances** -- https://aws.amazon.com/ec2/graviton/ -- ARM-based instances with better price-performance
- **Serverless Cost Patterns** -- https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html -- Pay-per-use compute economics
- **Storage Tiering** -- https://docs.aws.amazon.com/AmazonS3/latest/userguide/intelligent-tiering.html -- Automatic data lifecycle optimization
