#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# InternConnect — Full Kubernetes Deployment Script (14 Phases)
# Usage: bash deploy-minikube.sh
# Requirements: minikube, kubectl, helm, docker
# ══════════════════════════════════════════════════════════════════════════════
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()    { echo -e "${GREEN}[INFO]${NC}  $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
section() { echo -e "\n${GREEN}══ $1 ══${NC}"; }

# ── Check prerequisites ────────────────────────────────────────────────────────
section "Checking Prerequisites"
for cmd in minikube kubectl docker helm; do
  command -v $cmd >/dev/null 2>&1 || { echo -e "${RED}[ERROR]${NC} '$cmd' not found. Please install it first."; exit 1; }
  info "$cmd found ✓"
done

# ── Phase 4: Start Minikube ────────────────────────────────────────────────────
section "Phase 4 — Starting Minikube Cluster"
minikube start --driver=docker --cpus=4 --memory=4096
info "Cluster started ✓"
kubectl cluster-info
kubectl get nodes

# ── Enable Addons ──────────────────────────────────────────────────────────────
section "Enabling Minikube Addons"
minikube addons enable ingress
minikube addons enable metrics-server
minikube addons enable dashboard
info "Addons enabled ✓"

# ── Phase 2: Build Docker Images inside Minikube ──────────────────────────────
section "Phase 2 — Building Docker Images"
info "Pointing Docker CLI to Minikube daemon..."
eval $(minikube docker-env)

info "Building backend image..."
docker build -f docker/Dockerfile.backend -t internconnect-backend:latest .
info "Backend image built ✓"

info "Building frontend image..."
docker build -f docker/Dockerfile.frontend \
  --build-arg VITE_API_BASE_URL=http://internconnect.local/api \
  -t internconnect-frontend:latest .
info "Frontend image built ✓"

# ── Phase 5: Create Namespace ──────────────────────────────────────────────────
section "Phase 5 — Creating Namespace"
kubectl apply -f k8s/namespace.yaml
info "Namespace 'internconnect' created ✓"

# ── Apply Secrets ──────────────────────────────────────────────────────────────
section "Applying Secrets"
warn "Make sure k8s/secrets.yaml has your real values before proceeding!"
kubectl apply -f k8s/secrets.yaml
info "Secrets applied ✓"

# ── Phase 6+9: Deploy Database (StatefulSet + PVC) ────────────────────────────
section "Phase 6+9 — Deploying PostgreSQL (StatefulSet)"
kubectl apply -f k8s/postgres.yaml
info "Waiting for PostgreSQL to be ready..."
kubectl wait --for=condition=ready pod -l app=postgres -n internconnect --timeout=180s
info "PostgreSQL ready ✓"

# ── Deploy Redis ───────────────────────────────────────────────────────────────
section "Deploying Redis"
kubectl apply -f k8s/redis.yaml
kubectl wait --for=condition=ready pod -l app=redis -n internconnect --timeout=60s
info "Redis ready ✓"

# ── Deploy Backend ─────────────────────────────────────────────────────────────
section "Phase 6 — Deploying Django Backend"
kubectl apply -f k8s/backend.yaml
info "Waiting for backend to be ready..."
kubectl wait --for=condition=ready pod -l app=backend -n internconnect --timeout=180s
info "Backend ready ✓"

# ── Run Migrations ─────────────────────────────────────────────────────────────
section "Running Django Migrations"
BACKEND_POD=$(kubectl get pods -n internconnect -l app=backend -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n internconnect $BACKEND_POD -- python manage.py migrate --noinput
info "Migrations complete ✓"

# ── Deploy Frontend + Nginx ────────────────────────────────────────────────────
section "Phase 6 — Deploying Frontend + Nginx"
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/nginx.yaml
kubectl wait --for=condition=ready pod -l app=frontend -n internconnect --timeout=120s
kubectl wait --for=condition=ready pod -l app=nginx    -n internconnect --timeout=60s
info "Frontend and Nginx ready ✓"

# ── Phase 8: Ingress ───────────────────────────────────────────────────────────
section "Phase 8 — Configuring Ingress"
kubectl apply -f k8s/ingress.yaml
MINIKUBE_IP=$(minikube ip)
info "Ingress configured ✓"
warn "Add this to your hosts file (C:/Windows/System32/drivers/etc/hosts):"
warn "  $MINIKUBE_IP  internconnect.local"

# ── Phase 11: Auto Scaling ─────────────────────────────────────────────────────
section "Phase 11 — Configuring Auto Scaling (HPA)"
kubectl apply -f k8s/hpa-backend.yaml
kubectl apply -f k8s/hpa-frontend.yaml
info "HPA configured ✓"
kubectl get hpa -n internconnect

# ── Phase 12+13+14: Monitoring ─────────────────────────────────────────────────
section "Phase 12+13 — Installing Prometheus + Grafana (Helm)"
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --values k8s/monitoring/prometheus-values.yaml \
  --values k8s/monitoring/grafana-values.yaml \
  --wait \
  --timeout 5m
info "Prometheus + Grafana installed ✓"

# ── Phase 14: Alert Rules ──────────────────────────────────────────────────────
section "Phase 14 — Applying Alert Rules"
kubectl apply -f k8s/monitoring/alertrules.yaml
info "Alert rules applied ✓"

# ── Final Status ───────────────────────────────────────────────────────────────
section "Deployment Complete!"
echo ""
info "📦 All Pods:"
kubectl get pods -n internconnect
echo ""
info "🌐 Services:"
kubectl get svc -n internconnect
echo ""
info "📈 HPA Status:"
kubectl get hpa -n internconnect
echo ""
NODEPORT_URL=$(minikube service nginx-service -n internconnect --url 2>/dev/null || echo "http://$MINIKUBE_IP:30080")
info "🚀 App URL (NodePort):  $NODEPORT_URL"
info "🌍 App URL (Ingress):   http://internconnect.local  (after hosts file update)"
info "📊 Prometheus:          kubectl port-forward svc/prometheus-kube-prometheus-prometheus 9090:9090 -n monitoring"
info "📊 Grafana:             kubectl port-forward svc/prometheus-grafana 3000:80 -n monitoring"
info "                        Login: admin / admin123"
info "📋 K8s Dashboard:       minikube dashboard"
echo ""
info "✅ All 14 phases complete!"
