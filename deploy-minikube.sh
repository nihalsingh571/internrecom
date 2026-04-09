#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# InternConnect - Minikube Deployment Script
# Usage: bash deploy-minikube.sh
# ──────────────────────────────────────────────────────────────────────────────
set -e

echo "🚀 Starting InternConnect Kubernetes deployment on Minikube..."

# 1. Check prerequisites
command -v minikube >/dev/null || { echo "❌ minikube not found. Install from https://minikube.sigs.k8s.io/"; exit 1; }
command -v kubectl >/dev/null  || { echo "❌ kubectl not found. Install from https://kubernetes.io/docs/tasks/tools/"; exit 1; }
command -v docker  >/dev/null  || { echo "❌ docker not found. Install Docker Desktop."; exit 1; }

# 2. Start Minikube
echo "▶️  Starting Minikube..."
minikube start --driver=docker --cpus=4 --memory=4096

# 3. Point Docker CLI to Minikube's internal Docker daemon
echo "🐳 Configuring Docker to use Minikube's daemon..."
eval $(minikube docker-env)

# 4. Build Docker images inside Minikube
echo "🔨 Building backend image..."
docker build -f docker/Dockerfile.backend -t internconnect-backend:latest .

echo "🔨 Building frontend image..."
docker build -f docker/Dockerfile.frontend -t internconnect-frontend:latest .

# 5. Apply Kubernetes manifests in order
echo "📦 Applying Kubernetes manifests..."
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/postgres-pvc.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml

echo "⏳ Waiting for database to be ready..."
kubectl wait --for=condition=ready pod -l app=postgres -n internconnect --timeout=120s

kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/nginx.yaml

# 6. Wait for all pods to be ready
echo "⏳ Waiting for all pods to be ready..."
kubectl wait --for=condition=ready pod -l app=backend  -n internconnect --timeout=180s
kubectl wait --for=condition=ready pod -l app=frontend -n internconnect --timeout=120s
kubectl wait --for=condition=ready pod -l app=nginx    -n internconnect --timeout=60s

# 7. Run Django migrations
echo "🗄️  Running Django migrations..."
BACKEND_POD=$(kubectl get pods -n internconnect -l app=backend -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n internconnect $BACKEND_POD -- python manage.py migrate

# 8. Show access URL
echo ""
echo "✅ Deployment complete!"
echo "🌐 App URL: $(minikube service nginx-service -n internconnect --url)"
echo ""
echo "📋 Pod Status:"
kubectl get pods -n internconnect
