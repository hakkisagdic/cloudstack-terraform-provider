# CloudStack Terraform Provider - Docker Kullanımı

✅ **Hypervisor Parametresi Desteği Eklenmiş Versiyon**

Bu Docker image, CloudStack Terraform Provider'ın hypervisor parametresi desteği eklenmiş versiyonunu içerir.

## 🚀 Hızlı Başlangıç

### 1. Provider Binary'lerini Build Et

```bash
# Build klasörünü oluştur
mkdir -p build

# AMD64 (Intel/AMD Linux) için
GOOS=linux GOARCH=amd64 go build -o build/terraform-provider-cloudstack_linux_amd64 -ldflags="-w -s"

# ARM64 (Apple Silicon/ARM Linux) için
GOOS=linux GOARCH=arm64 go build -o build/terraform-provider-cloudstack_linux_arm64 -ldflags="-w -s"
```

### 2. Docker Image Build

```bash
docker build -f Dockerfile.terraform -t cloudstack-terraform:latest .
```

### 3. Kullanım Örneği

```bash
# Terraform dosyalarınızın olduğu dizinde
docker run --rm \
  -v $(pwd):/workspace \
  cloudstack-terraform:latest init

docker run --rm \
  -v $(pwd):/workspace \
  cloudstack-terraform:latest plan

docker run --rm \
  -v $(pwd):/workspace \
  cloudstack-terraform:latest apply -auto-approve
```

## 📋 Örnek Terraform Config

Örnek dosyalar `docs/examples/docker-example/` klasöründe:

```hcl
terraform {
  required_providers {
    cloudstack = {
      source  = "local/cloudstack/cloudstack"
      version = "1.0.0"
    }
  }
}

provider "cloudstack" {
  api_url    = var.cloudstack_api_url
  api_key    = var.cloudstack_api_key
  secret_key = var.cloudstack_secret_key
}

resource "cloudstack_instance" "vm" {
  name             = "my-vm"
  template         = var.template_id
  network_id       = var.network_id
  hypervisor       = "VMware"  # 🆕 YENİ PARAMETRE!
  disk_offering    = "Medium"
  service_offering = "Medium Instance"
  zone             = var.zone
}
```

## 🔧 MCP Projelerinde Kullanım

MCP server'ından Terraform çalıştırma:

```javascript
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function createCloudStackVM(config) {
  const tfDir = '/tmp/terraform-workspace';
  
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
      api_url    = "${config.apiUrl}"
      api_key    = "${config.apiKey}"
      secret_key = "${config.secretKey}"
    }
    
    resource "cloudstack_instance" "vm" {
      name             = "${config.vmName}"
      template         = "${config.templateId}"
      network_id       = "${config.networkId}"
      hypervisor       = "${config.hypervisor}"
      service_offering = "${config.serviceOffering}"
      zone             = "${config.zone}"
      disk_offering    = "${config.diskOffering || 'Medium'}"
      start_vm         = false
      expunge          = true
    }
    
    output "vm_id" {
      value = cloudstack_instance.vm.id
    }
  `;
  
  // Config dosyasını yaz
  require('fs').writeFileSync(`${tfDir}/main.tf`, tfConfig);
  
  // Terraform init
  await execPromise(`docker run --rm -v ${tfDir}:/workspace cloudstack-terraform:latest init`);
  
  // Terraform apply
  const { stdout } = await execPromise(
    `docker run --rm -v ${tfDir}:/workspace cloudstack-terraform:latest apply -auto-approve`
  );
  
  return stdout;
}

// Kullanım
const result = await createCloudStackVM({
  vmName: 'test-vm',
  apiUrl: 'http://cloudstack.example.com/client/api',
  apiKey: 'your-key',
  secretKey: 'your-secret',
  templateId: 'iso-template-id',
  networkId: 'vpc-network-id',
  hypervisor: 'VMware',
  serviceOffering: 'Medium Instance',
  zone: 'ZONE'
});
```

## 🎯 Dosya Açıklamaları

### Binary Dosyaları (build/ klasöründe)
- `terraform-provider-cloudstack_linux_amd64`: AMD64/Intel Linux için provider binary
- `terraform-provider-cloudstack_linux_arm64`: ARM64/Apple Silicon Linux için provider binary

Bu dosyalar Docker build sırasında kullanılır ve container içine kopyalanır.

### Terraform State Dosyaları
- `terraform.tfstate`: Terraform'un yönettiği kaynakların durumu (otomatik oluşturulur)
- `.terraform/`: Provider cache ve metadata (otomatik oluşturulur)
- `.terraform.lock.hcl`: Provider version lock file (otomatik oluşturulur)

**Not:** Bu dosyalar `.gitignore`'da - commit edilmez.

## 📦 Image Özellikleri

- Base: `hashicorp/terraform:1.9`
- Platforms: linux_amd64, linux_arm64
- Provider: local/cloudstack/cloudstack v1.0.0
- Extra tools: bash, curl, jq

## 📚 Detaylı Dokümantasyon

- [Detaylı Kullanım Kılavuzu](docs/DOCKER_USAGE.md)
- [Örnek Terraform Configs](docs/examples/docker-example/)

## 🐛 Troubleshooting

### Provider bulunamıyor hatası
```bash
# Provider'ı kontrol et
docker run --rm --entrypoint sh cloudstack-terraform:latest -c \
  "ls -la /root/.terraform.d/plugins/local/cloudstack/cloudstack/1.0.0/"
```

### Platform uyumsuzluğu
Docker'ınızın mimarisi ile provider binary'si eşleşmeli. Image her iki platformu da içerir.

