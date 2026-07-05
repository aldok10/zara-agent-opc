# Organization Security Policy in Rego
# Enforces baseline security controls for Kubernetes deployments

package organization.security

import rego.v1

# Deny containers running as root
deny contains msg if {
    input.kind == "Deployment"
    some container in input.spec.template.spec.containers
    not container.securityContext.runAsNonRoot
    msg := sprintf(
        "DENY: Container '%s' in Deployment '%s' must set securityContext.runAsNonRoot: true",
        [container.name, input.metadata.name],
    )
}

# Deny containers without resource limits
deny contains msg if {
    input.kind == "Deployment"
    some container in input.spec.template.spec.containers
    not container.resources.limits.memory
    msg := sprintf(
        "DENY: Container '%s' in Deployment '%s' must define memory limits",
        [container.name, input.metadata.name],
    )
}

deny contains msg if {
    input.kind == "Deployment"
    some container in input.spec.template.spec.containers
    not container.resources.limits.cpu
    msg := sprintf(
        "DENY: Container '%s' in Deployment '%s' must define CPU limits",
        [container.name, input.metadata.name],
    )
}

# Deny privileged containers
deny contains msg if {
    input.kind == "Deployment"
    some container in input.spec.template.spec.containers
    container.securityContext.privileged == true
    msg := sprintf(
        "DENY: Container '%s' in Deployment '%s' must not run in privileged mode",
        [container.name, input.metadata.name],
    )
}

# Deny images without explicit tag (no :latest or untagged)
deny contains msg if {
    input.kind == "Deployment"
    some container in input.spec.template.spec.containers
    image := container.image
    not contains(image, "@sha256:")
    tag := split(image, ":")[1]
    tag == "latest"
    msg := sprintf(
        "DENY: Container '%s' in Deployment '%s' uses :latest tag. Pin to digest or specific version",
        [container.name, input.metadata.name],
    )
}

deny contains msg if {
    input.kind == "Deployment"
    some container in input.spec.template.spec.containers
    image := container.image
    not contains(image, ":")
    not contains(image, "@")
    msg := sprintf(
        "DENY: Container '%s' in Deployment '%s' has no image tag. Pin to digest or specific version",
        [container.name, input.metadata.name],
    )
}

# Deny hostNetwork
deny contains msg if {
    input.kind == "Deployment"
    input.spec.template.spec.hostNetwork == true
    msg := sprintf(
        "DENY: Deployment '%s' must not use hostNetwork",
        [input.metadata.name],
    )
}

# Deny hostPID
deny contains msg if {
    input.kind == "Deployment"
    input.spec.template.spec.hostPID == true
    msg := sprintf(
        "DENY: Deployment '%s' must not use hostPID",
        [input.metadata.name],
    )
}

# Require readOnlyRootFilesystem
deny contains msg if {
    input.kind == "Deployment"
    some container in input.spec.template.spec.containers
    not container.securityContext.readOnlyRootFilesystem
    msg := sprintf(
        "WARN: Container '%s' in Deployment '%s' should set readOnlyRootFilesystem: true",
        [container.name, input.metadata.name],
    )
}

# Deny containers requesting dangerous capabilities
dangerous_capabilities := {"NET_ADMIN", "SYS_ADMIN", "ALL", "NET_RAW", "SYS_PTRACE"}

deny contains msg if {
    input.kind == "Deployment"
    some container in input.spec.template.spec.containers
    some cap in container.securityContext.capabilities.add
    cap in dangerous_capabilities
    msg := sprintf(
        "DENY: Container '%s' in Deployment '%s' requests dangerous capability '%s'",
        [container.name, input.metadata.name, cap],
    )
}

# Require approved image registries
approved_registries := {
    "gcr.io/our-org",
    "us-docker.pkg.dev/our-org",
    "registry.our-company.com",
}

deny contains msg if {
    input.kind == "Deployment"
    some container in input.spec.template.spec.containers
    image := container.image
    not image_from_approved_registry(image)
    msg := sprintf(
        "DENY: Container '%s' in Deployment '%s' uses unapproved registry. Image: '%s'",
        [container.name, input.metadata.name, image],
    )
}

image_from_approved_registry(image) if {
    some registry in approved_registries
    startswith(image, registry)
}

# Require mandatory labels
required_labels := {"app", "team", "environment"}

deny contains msg if {
    input.kind == "Deployment"
    some label in required_labels
    not input.metadata.labels[label]
    msg := sprintf(
        "DENY: Deployment '%s' missing required label '%s'",
        [input.metadata.name, label],
    )
}

# Deny Services of type LoadBalancer without annotation for internal
deny contains msg if {
    input.kind == "Service"
    input.spec.type == "LoadBalancer"
    not input.metadata.annotations["cloud.google.com/load-balancer-type"]
    not input.metadata.annotations["service.beta.kubernetes.io/aws-load-balancer-internal"]
    msg := sprintf(
        "DENY: Service '%s' is an external LoadBalancer. Use internal LB annotation or Ingress",
        [input.metadata.name],
    )
}

# Namespace restrictions -- deny default namespace for workloads
deny contains msg if {
    input.kind == "Deployment"
    input.metadata.namespace == "default"
    msg := sprintf(
        "DENY: Deployment '%s' must not use the default namespace",
        [input.metadata.name],
    )
}
