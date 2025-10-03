terraform {
  required_providers {
    cloudstack = {
      source  = "local/cloudstack/cloudstack"  # Docker'daki local provider
      version = "1.0.0"
    }
  }
}

provider "cloudstack" {
  api_url    = var.cloudstack_api_url
  api_key    = var.cloudstack_api_key
  secret_key = var.cloudstack_secret_key
}

variable "cloudstack_api_url" {
  description = "CloudStack API URL"
  type        = string
}

variable "cloudstack_api_key" {
  description = "CloudStack API Key"
  type        = string
  sensitive   = true
}

variable "cloudstack_secret_key" {
  description = "CloudStack Secret Key"
  type        = string
  sensitive   = true
}

# Example: Create VM with hypervisor parameter
resource "cloudstack_instance" "example" {
  name             = "terraform-docker-example"
  display_name     = "Terraform Docker Example VM"
  service_offering = var.service_offering
  template         = var.template_id
  network_id       = var.network_id
  zone             = var.zone

  # Hypervisor parameter - new feature!
  hypervisor       = var.hypervisor

  start_vm         = false
  expunge          = true
}

variable "service_offering" {
  description = "Service Offering name or ID"
  type        = string
}

variable "template_id" {
  description = "Template or ISO ID"
  type        = string
}

variable "network_id" {
  description = "Network ID"
  type        = string
}

variable "zone" {
  description = "Zone name"
  type        = string
}

variable "hypervisor" {
  description = "Hypervisor type (VMware, KVM, XenServer, etc.)"
  type        = string
  default     = "VMware"
}

output "vm_id" {
  value       = cloudstack_instance.example.id
  description = "Created VM ID"
}

output "vm_ip" {
  value       = cloudstack_instance.example.ip_address
  description = "VM IP Address"
}

output "vm_hypervisor" {
  value       = cloudstack_instance.example.hypervisor
  description = "VM Hypervisor Type"
}
