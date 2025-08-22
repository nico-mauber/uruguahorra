# Test scenarios for billing system

## Testing MercadoPago Webhooks

### 1. Test preapproval creation

```bash
curl -X POST http://localhost:54321/functions/v1/billing-webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "type": "preapproval",
    "action": "created",
    "data": {
      "id": "2c938084-test-preapproval-id"
    },
    "date_created": "2024-01-15T10:00:00Z",
    "user_id": "test_user_123"
  }'
```

### 2. Test payment success

```bash
curl -X POST http://localhost:54321/functions/v1/billing-webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "type": "customer.subscription.updated",
    "data": {
      "object": {
        "id": "sub_test_123456789",
        "status": "active",
        "current_period_start": 1703980800,
        "current_period_end": 1706659200,
        "metadata": {
          "userId": "550e8400-e29b-41d4-a716-446655440000"
        }
      }
    }
  }'
```

## Testing MercadoPago Webhooks

### 1. Test preapproval created

```bash
curl -X POST http://localhost:54321/functions/v1/billing-webhooks?provider=mercadopago \
  -H "Content-Type: application/json" \
  -d '{
    "type": "preapproval",
    "action": "created",
    "data": {
      "id": "2c938084726fca480172750000000000"
    },
    "date_created": "2024-01-01T10:00:00.000Z",
    "live_mode": false
  }'
```

### 2. Test payment notification

```bash
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment",
    "action": "created",
    "data": {
      "id": "12345678901"
    },
    "date_created": "2024-01-01T10:00:00.000Z",
    "live_mode": false
  }'
```

## Manual UI Testing

1. **Open paywall screen**
   - Navigate to `/paywall`
   - Verify both plans are displayed
   - Check pricing and features

2. **Select plans**
   - Click on monthly plan
   - Click on yearly plan
   - Verify selection state changes

3. **Subscribe flow**
   - Click "Suscribirse" button
   - Verify MercadoPago checkout opens
   - Check loading states

4. **Premium user state**
   - Mock premium user status
   - Verify paywall shows "Ya eres Premium"
   - Verify subscribe button is disabled
