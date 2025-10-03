package cloudstack

import (
	"testing"

	"github.com/hashicorp/terraform-plugin-sdk/v2/helper/schema"
)

// Test that hypervisor field exists in schema
func TestCloudStackInstance_HypervisorSchemaExists(t *testing.T) {
	resource := resourceCloudStackInstance()

	hypervisorField, exists := resource.Schema["hypervisor"]
	if !exists {
		t.Fatal("hypervisor field does not exist in schema")
	}

	if hypervisorField.Type != schema.TypeString {
		t.Errorf("hypervisor field type = %v, want %v", hypervisorField.Type, schema.TypeString)
	}

	if !hypervisorField.Optional {
		t.Error("hypervisor field should be Optional")
	}

	if !hypervisorField.Computed {
		t.Error("hypervisor field should be Computed")
	}

	if !hypervisorField.ForceNew {
		t.Error("hypervisor field should be ForceNew")
	}
}

// Test that all expected fields exist
func TestCloudStackInstance_SchemaFieldsExist(t *testing.T) {
	resource := resourceCloudStackInstance()

	requiredFields := []string{
		"name",
		"display_name",
		"service_offering",
		"template",
		"hypervisor", // NEW FIELD
		"zone",
	}

	for _, field := range requiredFields {
		if _, exists := resource.Schema[field]; !exists {
			t.Errorf("Required field '%s' does not exist in schema", field)
		}
	}
}
