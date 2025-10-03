# CloudStack Terraform Provider - Docker Kullanımı

Bu Docker image'ı Terraform ve CloudStack Provider'ı içerir. MCP projelerinde veya CI/CD pipeline'larında kullanabilirsiniz.

## 📦 Docker Image Build

```bash
# CloudStack Provider dizininde
docker build -f Dockerfile.terraform -t cloudstack-terraform:latest .
```

## 🚀 Kullanım

### 1. Basit Kullanım

```bash
# Terraform version kontrolü
docker run --rm cloudstack-terraform:latest terraform version

# Provider kontrolü
docker run --rm cloudstack-terraform:latest terraform providers
```

### 2. Terraform Dosyalarını Çalıştırma

```bash
# Örnek dizinine git
cd examples/docker-example

# terraform.tfvars dosyasını oluştur
cp terraform.tfvars.example terraform.tfvars
# Değerleri düzenle: vi terraform.tfvars

# Terraform init
docker run --rm \
  -v $(pwd):/workspace \
  cloudstack-terraform:latest \
  terraform init

# Terraform plan
docker run --rm \
  -v $(pwd):/workspace \
  cloudstack-terraform:latest \
  terraform plan

# Terraform apply
docker run --rm \
  -v $(pwd):/workspace \
  cloudstack-terraform:latest \
  terraform apply -auto-approve
```

### 3. Environment Variables ile Kullanım

```bash
docker run --rm \
  -v $(pwd):/workspace \
  -e TF_VAR_cloudstack_api_url="http://cs01.ltsbilisim.tr:8080/client/api" \
  -e TF_VAR_cloudstack_api_key="your-api-key" \
  -e TF_VAR_cloudstack_secret_key="your-secret-key" \
  -e TF_VAR_service_offering="Medium Instance" \
  -e TF_VAR_template_id="your-iso-id" \
  -e TF_VAR_network_id="your-vpc-network-id" \
  -e TF_VAR_zone="ZONE" \
  -e TF_VAR_hypervisor="VMware" \
  cloudstack-terraform:latest \
  terraform apply -auto-approve
```

### 4. MCP Projelerinde Kullanım

MCP server'ından shell command ile:

```javascript
// Node.js'de (MCP içinde)
const { exec } = require('child_process');

function createCloudStackVM(config) {
  const cmd = `
    docker run --rm \\
      -v /tmp/terraform:/workspace \\
      -e TF_VAR_cloudstack_api_url="${config.apiUrl}" \\
      -e TF_VAR_cloudstack_api_key="${config.apiKey}" \\
      -e TF_VAR_cloudstack_secret_key="${config.secretKey}" \\
      -e TF_VAR_template_id="${config.templateId}" \\
      -e TF_VAR_network_id="${config.networkId}" \\
      -e TF_VAR_zone="${config.zone}" \\
      -e TF_VAR_hypervisor="${config.hypervisor}" \\
      cloudstack-terraform:latest \\
      terraform apply -auto-approve
  `;

  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve(stdout);
    });
  });
}
```

### 5. Docker Compose ile Kullanım

```yaml
# docker-compose.yml
version: '3.8'

services:
  terraform:
    image: cloudstack-terraform:latest
    volumes:
      - ./terraform:/workspace
    environment:
      - TF_VAR_cloudstack_api_url=${CLOUDSTACK_API_URL}
      - TF_VAR_cloudstack_api_key=${CLOUDSTACK_API_KEY}
      - TF_VAR_cloudstack_secret_key=${CLOUDSTACK_SECRET_KEY}
    command: terraform apply -auto-approve
```

## 🔧 Provider Özellikleri

### Hypervisor Parametresi (Yeni!)

ISO template'lerle VM oluştururken artık hypervisor parametresi destekleniyor:

```hcl
resource "cloudstack_instance" "vm" {
  template       = "windows-2022-iso-id"
  network_id     = "vpc-network-id"
  hypervisor     = "VMware"  # VMware, KVM, XenServer, vb.
  disk_offering  = "Medium"
  service_offering = "Medium Instance"
  zone           = "ZONE"
}
```

## 🐛 Debugging

```bash
# Debug modda çalıştır
docker run --rm \
  -v $(pwd):/workspace \
  -e TF_LOG=DEBUG \
  cloudstack-terraform:latest \
  terraform plan

# Container içine gir
docker run --rm -it \
  -v $(pwd):/workspace \
  --entrypoint /bin/sh \
  cloudstack-terraform:latest

# Provider'ı kontrol et
ls -la /root/.terraform.d/plugins/local/cloudstack/cloudstack/1.0.0/linux_amd64/
```

## 📝 Notlar

- Provider lokal olarak yüklüdür: `local/cloudstack/cloudstack`
- Terraform version: 1.9
- Provider version: 1.0.0
- Platform: linux_amd64

## 🔗 Linkler

- [CloudStack API Docs](https://cloudstack.apache.org/api.html)
- [Terraform Registry](https://registry.terraform.io/)
- [Provider Source Code](https://github.com/apache/cloudstack-terraform-provider)
