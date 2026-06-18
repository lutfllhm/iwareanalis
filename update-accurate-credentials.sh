#!/bin/bash
# Script untuk update Accurate credentials di VPS

echo "Update Accurate Credentials Script"
echo "==================================="
echo ""
echo "Masukkan Client ID baru (atau tekan Enter untuk skip):"
read CLIENT_ID

echo "Masukkan Client Secret baru (atau tekan Enter untuk skip):"
read CLIENT_SECRET

if [ ! -z "$CLIENT_ID" ]; then
    sed -i "s/ACCURATE_CLIENT_ID=.*/ACCURATE_CLIENT_ID=$CLIENT_ID/" /opt/analis/.env
    echo "✅ Client ID updated"
fi

if [ ! -z "$CLIENT_SECRET" ]; then
    sed -i "s/ACCURATE_CLIENT_SECRET=.*/ACCURATE_CLIENT_SECRET=$CLIENT_SECRET/" /opt/analis/.env
    echo "✅ Client Secret updated"
fi

echo ""
echo "Restarting backend container..."
cd /opt/analis
docker compose restart dataanalis-backend

echo ""
echo "✅ Done! Credentials updated and backend restarted"
echo "Current Accurate config:"
grep "ACCURATE" /opt/analis/.env
