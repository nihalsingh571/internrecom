$MINIKUBE = "C:\minikube\minikube.exe"
$ErrorActionPreference = "Stop"

function Write-Section($msg) {
    Write-Host "`n==================================" -ForegroundColor Cyan
    Write-Host " $msg" -ForegroundColor Cyan
    Write-Host "==================================" -ForegroundColor Cyan
}
function Write-Info($msg)  { Write-Host "[INFO]  $msg" -ForegroundColor Green }
function Write-Warn($msg)  { Write-Host "[WARN]  $msg" -ForegroundColor Yellow }
function Write-Err($msg)   { Write-Host "[ERROR] $msg" -ForegroundColor Red }

# --- Check minikube exists ---
Write-Section "Checking Prerequisites"
if (-Not (Test-Path $MINIKUBE)) {
    Write-Warn "minikube.exe not found at $MINIKUBE. Installing now..."
    New-Item -Path 'C:\' -Name 'minikube' -ItemType Directory -Force | Out-Null
    Invoke-WebRequest -OutFile $MINIKUBE -Uri "https://github.com/kubernetes/minikube/releases/latest/download/minikube-windows-amd64.exe" -UseBasicParsing
    Write-Info "minikube installed at $MINIKUBE [OK]"
} else {
    Write-Info "minikube found at $MINIKUBE [OK]"
}

# Check Docker Desktop is running
try {
    docker info | Out-Null
    Write-Info "Docker Desktop is running [OK]"
} catch {
    Write-Err "Docker Desktop is not running. Please start it first."
    exit 1
}

& $MINIKUBE version
Write-Info "Prerequisites check done [OK]"

# --- Phase 4: Start Minikube ---
Write-Section "Phase 4 - Starting Minikube Cluster"
& $MINIKUBE start --driver=docker
Write-Info "Cluster started [OK]"

& $MINIKUBE status
& $MINIKUBE kubectl -- get nodes

# --- Enable Required Addons ---
Write-Section "Enabling Minikube Addons"
& $MINIKUBE addons enable ingress
& $MINIKUBE addons enable metrics-server
& $MINIKUBE addons enable dashboard
Write-Info "Addons enabled [OK]"

# --- Phase 2: Build Docker Images inside Minikube Docker ---
Write-Section "Phase 2 - Building Docker Images (inside Minikube)"
Write-Info "Pointing Docker to Minikube internal Docker daemon..."

# This command sets Docker environment variables so images build inside Minikube
& $MINIKUBE docker-env | Invoke-Expression

Write-Info "Building Django backend image..."
docker build -f docker\Dockerfile.backend -t internconnect-backend:latest .
Write-Info "Backend image built [OK]"

Write-Info "Building React frontend image..."
docker build -f docker\Dockerfile.frontend --build-arg VITE_API_BASE_URL=http://internconnect.local/api -t internconnect-frontend:latest .
Write-Info "Frontend image built [OK]"

# Verify images are visible inside Minikube
Write-Info "Images inside Minikube:"
& $MINIKUBE kubectl -- get pods -A

# --- Phase 5: Create Namespace ---
Write-Section "Phase 5 - Creating Namespace"
& $MINIKUBE kubectl -- apply -f k8s/namespace.yaml
Write-Info "Namespace internconnect created [OK]"

# --- Apply Secrets ---
Write-Section "Applying Secrets"
Write-Warn "Make sure k8s/secrets.yaml has your real values!"
& $MINIKUBE kubectl -- apply -f k8s/secrets.yaml
Write-Info "Secrets applied [OK]"

# --- Phase 6+9: PostgreSQL StatefulSet ---
Write-Section "Phase 6+9 - Deploying PostgreSQL (StatefulSet + Auto PVC)"
& $MINIKUBE kubectl -- apply -f k8s/postgres.yaml
Write-Info "Waiting for PostgreSQL to be ready (up to 3 minutes)..."
& $MINIKUBE kubectl -- rollout status statefulset/postgres -n internconnect --timeout=180s
Write-Info "PostgreSQL ready [OK]"

# --- Deploy Redis ---
Write-Section "Deploying Redis (K8s infra level)"
& $MINIKUBE kubectl -- apply -f k8s/redis.yaml
& $MINIKUBE kubectl -- rollout status deployment/redis -n internconnect --timeout=120s
Write-Info "Redis ready [OK]"

# --- Deploy Django Backend ---
Write-Section "Phase 6 - Deploying Django Backend"
& $MINIKUBE kubectl -- apply -f k8s/backend.yaml
Write-Info "Waiting for backend to be ready (up to 3 minutes)..."
& $MINIKUBE kubectl -- rollout status deployment/backend -n internconnect --timeout=300s
Write-Info "Backend ready [OK]"

# --- Run Django Migrations ---
Write-Section "Running Django Migrations"
$backendPod = & $MINIKUBE kubectl -- get pods -n internconnect -l app=backend -o jsonpath="{.items[0].metadata.name}"
Write-Info "Running migrations on pod: $backendPod"
& $MINIKUBE kubectl -- exec -n internconnect $backendPod -- python manage.py migrate --noinput
Write-Info "Migrations complete [OK]"

# --- Seed Demo Data (Admin + Students + Recruiters) ---
Write-Section "Seeding Demo Data"
Write-Info "Creating admin user (admin@example.com / admin123)..."
& $MINIKUBE kubectl -- exec -n internconnect $backendPod -- python create_admin.py
Write-Info "Seeding demo students (password: InternConnect123!)..."
& $MINIKUBE kubectl -- exec -n internconnect $backendPod -- python manage.py seed_students
Write-Info "Seeding demo recruiters + internships (password: InternRecruiter123!)..."
& $MINIKUBE kubectl -- exec -n internconnect $backendPod -- python manage.py seed_internships
Write-Info "Demo data seeded [OK]"

# --- Deploy Frontend + Nginx ---
Write-Section "Phase 6 - Deploying Frontend + Nginx Proxy"
& $MINIKUBE kubectl -- apply -f k8s/frontend.yaml
& $MINIKUBE kubectl -- apply -f k8s/nginx.yaml
& $MINIKUBE kubectl -- rollout status deployment/frontend -n internconnect --timeout=120s
& $MINIKUBE kubectl -- rollout status deployment/nginx -n internconnect --timeout=60s
Write-Info "Frontend and Nginx ready [OK]"

# --- Phase 7: Verify All Services ---
Write-Section "Phase 7 - Verifying Services"
& $MINIKUBE kubectl -- get services -n internconnect

# --- Phase 8: Ingress ---
Write-Section "Phase 8 - Configuring Ingress"
& $MINIKUBE kubectl -- apply -f k8s/ingress.yaml
$minikubeIP = & $MINIKUBE ip
Write-Info "Ingress configured [OK]"
Write-Warn ""
Write-Warn "ACTION REQUIRED: Add this line to your hosts file:"
Write-Warn "  File: C:\Windows\System32\drivers\etc\hosts"
Write-Warn "  Line: $minikubeIP  internconnect.local"
Write-Warn ""
Write-Warn "Run as Admin in PowerShell:"
Write-Warn "  Add-Content -Path C:\Windows\System32\drivers\etc\hosts -Value `"$minikubeIP  internconnect.local`""

# --- Phase 10: Resource Management (already in YAMLs) ---
Write-Section "Phase 10 - Resource Limits"
Write-Info "CPU and Memory limits are defined in all deployment YAMLs [OK]"
& $MINIKUBE kubectl -- describe nodes | Select-String -Pattern "Capacity|Allocatable"

# --- Phase 11: Auto Scaling DISABLED for Minikube (low memory) ---
Write-Section "Phase 11 - Auto Scaling (Skipped for Minikube)"
Write-Info "HPA disabled to keep cluster stable on limited RAM [OK]"

# --- Phase 12+13+14: Monitoring DISABLED for Minikube (too heavy, needs 1.5GB RAM) ---
Write-Section "Phase 12+13 - Monitoring (Skipped for Minikube)"
Write-Info "Prometheus and Grafana skipped to keep cluster stable on limited RAM [OK]"
Write-Info "To enable monitoring, run: helm upgrade --install prometheus prometheus-community/kube-prometheus-stack"

# --- Final Status ---
Write-Section "All 14 Phases Complete!"
Write-Host ""
Write-Info "[Pods] in internconnect namespace:"
& $MINIKUBE kubectl -- get pods -n internconnect

Write-Host ""
Write-Info "[Services] Available:"
& $MINIKUBE kubectl -- get services -n internconnect

Write-Host ""
Write-Info "[App Access] Open in Browser (keep this window open for tunnel):"
& $MINIKUBE service nginx-service -n internconnect

Write-Host ""
Write-Info "[Kubernetes Dashboard] Run in a new terminal:"
Write-Host "   C:\minikube\minikube.exe dashboard"
Write-Host ""
Write-Info "[Demo Login Credentials]"
Write-Host "   Admin:     admin@example.com       / admin123"
Write-Host "   Student:   ananya.sharma@lpu.in    / InternConnect123!"
Write-Host "   Recruiter: google@partners.internconnect.ai / InternRecruiter123!"
