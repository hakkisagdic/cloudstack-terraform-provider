/**
 * MCP Projesi - CloudStack Terraform Provider Entegrasyonu
 *
 * Bu örnek, MCP server'dan Docker ile Terraform'u çalıştırarak
 * CloudStack'te VM oluşturur.
 */

const { exec } = require('child_process');
const util = require('util');
const fs = require('fs').promises;
const path = require('path');

const execPromise = util.promisify(exec);

/**
 * CloudStack VM oluştur - Terraform ile
 */
async function createCloudStackVM(config) {
  const {
    vmName,
    apiUrl,
    apiKey,
    secretKey,
    templateId,
    networkId,
    zone,
    hypervisor = 'VMware',
    serviceOffering = 'Medium Instance',
    diskOffering = 'Medium'
  } = config;

  // 1. Geçici Terraform workspace oluştur
  const workspaceDir = `/tmp/terraform-${Date.now()}`;
  await fs.mkdir(workspaceDir, { recursive: true });

  try {
    // 2. Terraform configuration oluştur
    const tfConfig = `
terraform {
  required_providers {
    cloudstack = {
      source  = "local/cloudstack/cloudstack"
      version = "1.0.0"
    }
  }
}

provider "cloudstack" {
  api_url    = "${apiUrl}"
  api_key    = "${apiKey}"
  secret_key = "${secretKey}"
}

resource "cloudstack_instance" "vm" {
  name             = "${vmName}"
  display_name     = "${vmName}"
  template         = "${templateId}"
  network_id       = "${networkId}"
  hypervisor       = "${hypervisor}"
  service_offering = "${serviceOffering}"
  disk_offering    = "${diskOffering}"
  zone             = "${zone}"
  start_vm         = false
  expunge          = true
}

output "vm_id" {
  value = cloudstack_instance.vm.id
}

output "vm_ip" {
  value = cloudstack_instance.vm.ip_address
}

output "vm_hypervisor" {
  value = cloudstack_instance.vm.hypervisor
}
`;

    await fs.writeFile(path.join(workspaceDir, 'main.tf'), tfConfig);

    // 3. Terraform init
    console.log('🔧 Terraform init...');
    const { stdout: initOutput } = await execPromise(
      `docker run --rm -v ${workspaceDir}:/workspace cloudstack-terraform:latest init`
    );
    console.log(initOutput);

    // 4. Terraform plan
    console.log('📋 Terraform plan...');
    const { stdout: planOutput } = await execPromise(
      `docker run --rm -v ${workspaceDir}:/workspace cloudstack-terraform:latest plan`
    );
    console.log(planOutput);

    // 5. Terraform apply
    console.log('🚀 Creating VM...');
    const { stdout: applyOutput } = await execPromise(
      `docker run --rm -v ${workspaceDir}:/workspace cloudstack-terraform:latest apply -auto-approve`
    );
    console.log(applyOutput);

    // 6. Output'ları oku
    const { stdout: outputJson } = await execPromise(
      `docker run --rm -v ${workspaceDir}:/workspace cloudstack-terraform:latest output -json`
    );

    const outputs = JSON.parse(outputJson);

    return {
      success: true,
      vmId: outputs.vm_id?.value,
      vmIp: outputs.vm_ip?.value,
      hypervisor: outputs.vm_hypervisor?.value,
      workspace: workspaceDir
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

/**
 * VM'i yok et
 */
async function destroyCloudStackVM(workspaceDir) {
  try {
    console.log('🗑️  Destroying VM...');
    const { stdout } = await execPromise(
      `docker run --rm -v ${workspaceDir}:/workspace cloudstack-terraform:latest destroy -auto-approve`
    );
    console.log(stdout);

    // Workspace'i temizle
    await fs.rm(workspaceDir, { recursive: true });

    return { success: true };
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

/**
 * MCP Tool olarak expose et
 */
async function mcp_createCloudStackVM(args) {
  const result = await createCloudStackVM({
    vmName: args.vm_name,
    apiUrl: process.env.CLOUDSTACK_API_URL || args.api_url,
    apiKey: process.env.CLOUDSTACK_API_KEY || args.api_key,
    secretKey: process.env.CLOUDSTACK_SECRET_KEY || args.secret_key,
    templateId: args.template_id,
    networkId: args.network_id,
    zone: args.zone,
    hypervisor: args.hypervisor || 'VMware',
    serviceOffering: args.service_offering || 'Medium Instance',
    diskOffering: args.disk_offering || 'Medium'
  });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }
    ]
  };
}

// Export
module.exports = {
  createCloudStackVM,
  destroyCloudStackVM,
  mcp_createCloudStackVM
};

// Örnek kullanım
if (require.main === module) {
  (async () => {
    const result = await createCloudStackVM({
      vmName: 'test-vm-from-mcp',
      apiUrl: 'http://cs01.ltsbilisim.tr:8080/client/api',
      apiKey: 'your-api-key',
      secretKey: 'your-secret-key',
      templateId: '0483e899-20e5-4019-8347-490451f34915', // Windows ISO
      networkId: 'dee18506-611c-41fe-9b19-0ca2e77106b9', // VPC network
      zone: 'ZONE',
      hypervisor: 'VMware'
    });

    console.log('✅ Result:', result);

    // Cleanup
    // await destroyCloudStackVM(result.workspace);
  })();
}
