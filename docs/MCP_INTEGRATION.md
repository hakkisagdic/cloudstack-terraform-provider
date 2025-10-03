# MCP Projesi - CloudStack Terraform Provider Entegrasyonu

## 📋 İçindekiler
1. [Hızlı Başlangıç](#hızlı-başlangıç)
2. [Docker Image Hazırlığı](#docker-image-hazırlığı)
3. [MCP Server'a Ekleme](#mcp-servera-ekleme)
4. [Kullanım Örnekleri](#kullanım-örnekleri)

## 🚀 Hızlı Başlangıç

### 1. Docker Image'ı Hazırla

#### A. Aynı Makinede (En Kolay)
```bash
# CloudStack provider projesinde
cd ~/Documents/GitHub/cloudstack-terraform-provider

# Binary'leri build et
mkdir -p build
GOOS=linux GOARCH=amd64 go build -o build/terraform-provider-cloudstack_linux_amd64
GOOS=linux GOARCH=arm64 go build -o build/terraform-provider-cloudstack_linux_arm64

# Docker image build et
docker build -f Dockerfile.terraform -t cloudstack-terraform:latest .

# Image'ın mevcut olduğunu kontrol et
docker images | grep cloudstack-terraform
```

✅ **Artık MCP projenizden `cloudstack-terraform:latest` kullanabilirsiniz!**

#### B. Registry Kullan (Farklı Makineler İçin)
```bash
# GitHub Container Registry'ye push (önerilen)
echo $GITHUB_TOKEN | docker login ghcr.io -u hakkisagdic --password-stdin
docker tag cloudstack-terraform:latest ghcr.io/hakkisagdic/cloudstack-terraform:latest
docker push ghcr.io/hakkisagdic/cloudstack-terraform:latest

# MCP projesinde çek
docker pull ghcr.io/hakkisagdic/cloudstack-terraform:latest
docker tag ghcr.io/hakkisagdic/cloudstack-terraform:latest cloudstack-terraform:latest
```

### 2. MCP Server'a Tool Ekle

#### Utility-MCP Projesinde

`~/projects/cloudstack-go-mcp-proxy/utility-mcp/src/tools/terraform-cloudstack.js`:

```javascript
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';

const execAsync = promisify(exec);

/**
 * CloudStack VM oluştur - Terraform ile
 */
export async function createCloudStackVM(args) {
  const workspaceDir = `/tmp/terraform-${Date.now()}`;

  try {
    await mkdir(workspaceDir, { recursive: true });

    // Terraform config oluştur
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
  api_url    = "${args.api_url}"
  api_key    = "${args.api_key}"
  secret_key = "${args.secret_key}"
}

resource "cloudstack_instance" "vm" {
  name             = "${args.vm_name}"
  template         = "${args.template_id}"
  network_id       = "${args.network_id}"
  hypervisor       = "${args.hypervisor || 'VMware'}"
  service_offering = "${args.service_offering || 'Medium Instance'}"
  disk_offering    = "${args.disk_offering || 'Medium'}"
  zone             = "${args.zone}"
  start_vm         = false
  expunge          = true
}

output "vm_id" { value = cloudstack_instance.vm.id }
output "vm_ip" { value = cloudstack_instance.vm.ip_address }
`;

    await writeFile(join(workspaceDir, 'main.tf'), tfConfig);

    // Terraform init
    await execAsync(
      `docker run --rm -v ${workspaceDir}:/workspace cloudstack-terraform:latest init`
    );

    // Terraform apply
    const { stdout } = await execAsync(
      `docker run --rm -v ${workspaceDir}:/workspace cloudstack-terraform:latest apply -auto-approve`
    );

    // Output'ları al
    const { stdout: outputJson } = await execAsync(
      `docker run --rm -v ${workspaceDir}:/workspace cloudstack-terraform:latest output -json`
    );

    const outputs = JSON.parse(outputJson);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          vm_id: outputs.vm_id?.value,
          vm_ip: outputs.vm_ip?.value,
          terraform_workspace: workspaceDir
        }, null, 2)
      }]
    };

  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error.message
        }, null, 2)
      }]
    };
  }
}

/**
 * VM'i yok et
 */
export async function destroyCloudStackVM(args) {
  try {
    const { stdout } = await execAsync(
      `docker run --rm -v ${args.workspace_dir}:/workspace cloudstack-terraform:latest destroy -auto-approve`
    );

    // Cleanup
    await rm(args.workspace_dir, { recursive: true });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ success: true, message: 'VM destroyed' }, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ success: false, error: error.message }, null, 2)
      }]
    };
  }
}
```

#### Index.js'e Tool Ekle

`~/projects/cloudstack-go-mcp-proxy/utility-mcp/index.js`:

```javascript
// Import et
import { createCloudStackVM, destroyCloudStackVM } from './src/tools/terraform-cloudstack.js';

// Tools listesine ekle
const tools = {
  // ... mevcut tools

  terraform_create_vm: createCloudStackVM,
  terraform_destroy_vm: destroyCloudStackVM
};

// Tool tanımlamaları
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // ... mevcut tools

      {
        name: 'terraform_create_vm',
        description: 'Create CloudStack VM using Terraform with hypervisor support',
        inputSchema: {
          type: 'object',
          properties: {
            vm_name: { type: 'string', description: 'VM name' },
            api_url: { type: 'string', description: 'CloudStack API URL' },
            api_key: { type: 'string', description: 'API Key' },
            secret_key: { type: 'string', description: 'Secret Key' },
            template_id: { type: 'string', description: 'Template or ISO ID' },
            network_id: { type: 'string', description: 'Network ID' },
            zone: { type: 'string', description: 'Zone name' },
            hypervisor: { type: 'string', description: 'Hypervisor type (VMware, KVM, etc.)' },
            service_offering: { type: 'string', description: 'Service offering' },
            disk_offering: { type: 'string', description: 'Disk offering' }
          },
          required: ['vm_name', 'api_url', 'api_key', 'secret_key', 'template_id', 'network_id', 'zone']
        }
      },
      {
        name: 'terraform_destroy_vm',
        description: 'Destroy CloudStack VM created with Terraform',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_dir: { type: 'string', description: 'Terraform workspace directory' }
          },
          required: ['workspace_dir']
        }
      }
    ]
  };
});
```

## 🎯 Kullanım Örnekleri

### Claude Desktop'tan Kullan

```
User: Create a CloudStack VM using Terraform