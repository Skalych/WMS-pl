#!/bin/bash
# wms.command - Головне меню управління WMS Nexus

# Кольори
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # Без кольору
BOLD='\033[1m'

cd "$(dirname "$0")"

function show_header() {
    clear
    echo -e "${MAGENTA}${BOLD}"
    echo "  ██╗    ██╗███╗   ███╗███████╗    ███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗"
    echo "  ██║    ██║████╗ ████║██╔════╝    ████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝"
    echo "  ██║ █╗ ██║██╔████╔██║███████╗    ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗"
    echo "  ██║███╗██║██║╚██╔╝██║╚════██║    ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║"
    echo "  ╚███╔███╔╝██║ ╚═╝ ██║███████║    ██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║"
    echo "   ╚══╝╚══╝ ╚═╝     ╚═╝╚══════╝    ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝"
    echo -e "${NC}"
    echo -e "${CYAN}==============================================================================${NC}"
    echo -e "${BOLD}                     Warehouse Operations & Real-Time AI                      ${NC}"
    echo -e "${CYAN}==============================================================================${NC}"
    echo ""
}

function stop_all() {
    echo -e "${YELLOW}Зупиняємо всі сервіси WMS...${NC}"
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    docker compose down 2>/dev/null || true
    echo -e "${GREEN}Сервіси зупинено.${NC}"
    sleep 1
}

function seed_db() {
    echo -e "${CYAN}Запускаємо базу даних та додаємо користувачів...${NC}"
    docker compose up -d
    sleep 3
    cd backend
    if [ -d ".venv" ]; then
        source .venv/bin/activate
        python3 -m app.seed
    else
        echo -e "${RED}Помилка: не знайдено віртуальне середовище .venv у папці backend.${NC}"
    fi
    cd ..
    echo ""
    echo -e "${GREEN}✅ Базу даних успішно заповнено (Користувачі створені)!${NC}"
    echo -e "${YELLOW}Натисніть Enter, щоб повернутися в меню...${NC}"
    read
}

function start_system() {
    stop_all
    
    echo -e "${CYAN}[1/3] Запускаємо базу даних PostgreSQL...${NC}"
    docker compose up -d
    sleep 2

    echo -e "${CYAN}[2/3] Запускаємо бекенд FastAPI...${NC}"
    cd backend
    if [ -d ".venv" ]; then
        source .venv/bin/activate
    fi
    # Запускаємо бекенд у фоні і перенаправляємо логі у файл
    python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > backend.log 2>&1 &
    cd ..

    echo -e "${CYAN}[3/3] Запускаємо фронтенд React...${NC}"
    cd frontend
    if [ ! -d "node_modules/react-i18next" ]; then
        echo -e "${YELLOW}Встановлюємо необхідні бібліотеки для мов...${NC}"
        npm install react-i18next i18next > /dev/null 2>&1
    fi
    # Запускаємо фронтенд у фоні
    npm run dev -- --host 0.0.0.0 > frontend.log 2>&1 &
    cd ..

    sleep 4

    LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "localhost")
    
    show_header
    echo -e "${GREEN}✅ ВСІ СЕРВІСИ УСПІШНО ЗАПУЩЕНО!${NC}"
    echo -e "${CYAN}==============================================================================${NC}"
    echo -e " 🌐 ${BOLD}Mac:${NC}      http://localhost:3000"
    echo -e " 📱 ${BOLD}Мережа:${NC}   http://$LOCAL_IP:3000"
    echo -e "${CYAN}==============================================================================${NC}"
    echo -e " 🔑 ${YELLOW}Логін:${NC}    admin@wms.local"
    echo -e " 🔒 ${YELLOW}Пароль:${NC}   password123"
    echo -e "${CYAN}==============================================================================${NC}"
    echo -e "Логи пишуться у файли: ${BOLD}backend/backend.log${NC} та ${BOLD}frontend/frontend.log${NC}"
    echo ""
    echo -e "${MAGENTA}Натисніть CTRL+C щоб зупинити всі сервіси і повернутись до меню.${NC}"
    
    open http://localhost:3000
    
    stop_requested=0
    trap "stop_requested=1" INT
    while [ $stop_requested -eq 0 ]; do
        sleep 1
    done
    
    stop_all
    # Повертаємо стандартну поведінку CTRL+C для меню
    trap - INT
}

while true; do
    show_header
    echo -e "Оберіть опцію (введіть цифру і натисніть Enter):"
    echo ""
    echo -e "  ${GREEN}[1]${NC} 🚀 Запустити всю систему WMS"
    echo -e "  ${YELLOW}[2]${NC} 🔧 Скинути та наповнити базу даних (Виправить баг з логіном)"
    echo -e "  ${RED}[3]${NC} 🛑 Зупинити всі сервіси"
    echo -e "  ${CYAN}[4]${NC} 🚪 Вийти"
    echo ""
    read -p "Ваш вибір: " choice

    case $choice in
        1) start_system ;;
        2) seed_db ;;
        3) stop_all; echo -e "${YELLOW}Натисніть Enter...${NC}"; read ;;
        4) exit 0 ;;
        *) echo -e "${RED}Невірний вибір!${NC}"; sleep 1 ;;
    esac
done
