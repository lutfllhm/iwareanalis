#!/bin/bash
# Script untuk update Accurate credentials
# Usage: ./update-env-accurate.sh <NEW_CLIENT_ID> <NEW_CLIENT_SECRET>

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Usage: ./update-env-accurate.sh <CLIENT_ID> <CLIENT_SECRET>"
    echo ""
    echo "Example:"
    echo "./update-env-accurate.sh abc12345-6789 1234567890abcd"
    exit 1
fi

NEW_CLIENT_ID="$1"
NEW_CLIENT_SECRET="$2"

echo "Updating Accurate credentials..."
echo "================================"
echo ""

# Update .env file
sed -i "s/ACCURATE_CLIENT_ID=.*/ACCURATE_CLIENT_ID=$NEW_CLIENT_ID/" /opt/analis/.env
sed -i "s/ACCURATE_CLIENT_SECRET=.*/ACCURATE_CLIENT_SECRET=$NEW_CLIENT_SECRET/" /opt/analis/.env

echo "✅ Credentials updated in .env"
echo ""
echo "New configuration:"
grep "ACCURATE_CLIENT_ID\|ACCURATE_CLIENT_SECRET" /opt/analis/.env
echo ""

# Restart backend
echo "Restarting backend container..."
cd /opt/analis
docker compose restart dataanalis-backend

echo ""
echo "✅ Done! Backend restarted with new credentials."
echo ""
echo "Next steps:"
echo "1. Go to https://analys.iwareid.com"
echo "2. Login and go to Settings"
echo "3. Click 'Hubungkan ke Accurate'"
echo "4. Should work now!"
