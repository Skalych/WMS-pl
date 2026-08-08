#!/bin/bash
echo "Заповнення бази даних..."
source .venv/bin/activate
python -m app.seed
echo "Готово!"
