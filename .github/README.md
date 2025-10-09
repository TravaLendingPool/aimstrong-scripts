# GitHub Actions Setup

## Cách setup GitHub Secrets

Để GitHub Action có thể chạy được, bạn cần thêm các secrets sau vào repository:

1. Vào repository trên GitHub
2. Click vào **Settings** tab
3. Trong sidebar bên trái, click vào **Secrets and variables** > **Actions**
4. Click **New repository secret** và thêm các secrets sau:

### Required Secrets:

- `RPC_URL_BASE`: RPC URL cho Base network
- `RPC_URL_ARBITRUM`: RPC URL cho Arbitrum network
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key

### Optional Secrets:

- `PRIVATE_KEY`: Private key để ký transactions (nếu cần)
- `ALCHEMY_API_KEY`: API key cho Alchemy (nếu sử dụng)

## Workflows Available

### 1. run-main.yml

- Chạy tự động theo lịch (mỗi ngày lúc 2:00 UTC)
- Chạy khi push/PR vào branch main
- Có thể chạy thủ công từ Actions tab

### 2. manual-run.yml

- Chỉ chạy thủ công
- Có option chọn environment (production/staging/development)
- Đơn giản hơn, phù hợp cho testing

## Cách chạy thủ công

1. Vào **Actions** tab trong repository
2. Chọn workflow muốn chạy
3. Click **Run workflow**
4. Chọn branch và nhập parameters (nếu có)
5. Click **Run workflow**

## Monitoring

- Xem logs trong **Actions** tab
- Nếu có lỗi, logs sẽ được upload dưới dạng artifact
- Có thể setup notifications qua email/Slack
