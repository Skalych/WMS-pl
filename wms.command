#!/bin/bash
# wms.command — Головне меню управління WMS Nexus

CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'
BOLD='\033[1m'

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

PID_DIR="$ROOT/.wms"
BACKEND_PID="$PID_DIR/backend.pid"
FRONTEND_PID="$PID_DIR/frontend.pid"

mkdir -p "$PID_DIR"

# ─── Helpers ───────────────────────────────────────────────────────────────────

show_header() {
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

kill_port() {
    lsof -ti:"$1" | xargs kill -9 2>/dev/null || true
}

kill_by_pidfile() {
    local pidfile="$1"
    if [ -f "$pidfile" ]; then
        local pid
        pid=$(cat "$pidfile")
        kill "$pid" 2>/dev/null || true
        sleep 0.5
        kill -9 "$pid" 2>/dev/null || true
        rm -f "$pidfile"
    fi
}

check_docker() {
    if ! docker info >/dev/null 2>&1; then
        echo -e "${RED}❌ Docker не запущений. Відкрий Docker Desktop і спробуй знову.${NC}"
        return 1
    fi
    return 0
}

wait_for_postgres() {
    echo -e "${CYAN}   Очікуємо PostgreSQL...${NC}"
    local i
    for i in {1..30}; do
        if docker compose exec -T postgres pg_isready -U postgres -d wms_db >/dev/null 2>&1; then
            echo -e "${GREEN}   ✓ PostgreSQL готовий${NC}"
            return 0
        fi
        sleep 1
    done
    echo -e "${RED}   ✗ PostgreSQL не відповідає після 30 сек${NC}"
    return 1
}

port_in_use() {
    lsof -ti:"$1" >/dev/null 2>&1
}

ensure_backend_deps() {
    cd "$ROOT/backend"
    if [ ! -d ".venv" ]; then
        echo -e "${YELLOW}   Створюємо Python venv...${NC}"
        python3 -m venv .venv
    fi
    # shellcheck disable=SC1091
    source .venv/bin/activate
    if [ ! -f ".venv/.wms_deps_ok" ]; then
        echo -e "${YELLOW}   Встановлюємо Python залежності...${NC}"
        pip install -q -r requirements.txt
        touch .venv/.wms_deps_ok
    fi
    cd "$ROOT"
}

ensure_frontend_deps() {
    cd "$ROOT/frontend"
    local has_rollup=0
    [ -d "node_modules/@rollup/rollup-darwin-arm64" ] && has_rollup=1
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}   Встановлюємо npm залежності...${NC}"
        npm install
    elif [ "$has_rollup" -eq 0 ]; then
        echo -e "${YELLOW}   Перевстановлюємо npm залежності (rollup)...${NC}"
        rm -rf node_modules
        npm install
    fi
    cd "$ROOT"
}

run_db_migrations() {
    cd "$ROOT/backend"
    # shellcheck disable=SC1091
    source .venv/bin/activate
    echo -e "${CYAN}   Міграції БД (alembic upgrade head)...${NC}"
    if ! alembic upgrade head; then
        echo -e "${RED}   ✗ Міграції не вдались. Перевір backend/.env і Docker.${NC}"
        cd "$ROOT"
        return 1
    fi
    cd "$ROOT"
}

ensure_seed_data() {
    local user_count
    user_count=$(docker compose exec -T postgres psql -U postgres -d wms_db -tAc "SELECT count(*) FROM users;" 2>/dev/null | tr -d '[:space:]')
    if [ "${user_count:-0}" -gt 0 ]; then
        return 0
    fi
    echo -e "${YELLOW}   База без користувачів — наповнюємо demo-даними...${NC}"
    cd "$ROOT/backend"
    # shellcheck disable=SC1091
    source .venv/bin/activate
    if ! ALLOW_SEED=1 python3 -m app.seed; then
        echo -e "${RED}   ✗ Seed не вдався. Спробуй меню [2] Наповнити базу.${NC}"
        cd "$ROOT"
        return 1
    fi
    cd "$ROOT"
}

show_credentials() {
    echo -e "${CYAN}==============================================================================${NC}"
    echo -e " 🔑 ${BOLD}Demo-логіни${NC} (пароль для всіх: ${YELLOW}password123${NC})"
    echo -e "    Admin:    admin@wms.local"
    echo -e "    Picker:   ivan.p@wms.local"
    echo -e "    Inbound:  oleg.d@wms.local"
    echo -e "${CYAN}==============================================================================${NC}"
}

show_urls() {
    local ip
    ip=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "localhost")
    echo -e "${CYAN}==============================================================================${NC}"
    echo -e " 🌐 ${BOLD}Сайт:${NC}     http://localhost:3000"
    echo -e " 📱 ${BOLD}Мережа:${NC}   http://${ip}:3000"
    echo -e " 📚 ${BOLD}API docs:${NC} http://localhost:8000/docs"
    echo -e "${CYAN}==============================================================================${NC}"
}

# ─── Actions ─────────────────────────────────────────────────────────────────

stop_apps() {
    echo -e "${YELLOW}Зупиняємо backend і frontend...${NC}"
    kill_by_pidfile "$BACKEND_PID"
    kill_by_pidfile "$FRONTEND_PID"
    kill_port 8000
    kill_port 3000
    echo -e "${GREEN}✓ Backend і frontend зупинено.${NC}"
    echo -e "${CYAN}  PostgreSQL (Docker) залишається працювати.${NC}"
    sleep 1
}

stop_everything() {
    stop_apps
    echo -e "${YELLOW}Зупиняємо PostgreSQL (Docker)...${NC}"
    docker compose down 2>/dev/null || true
    echo -e "${GREEN}✓ Усе зупинено.${NC}"
    sleep 1
}

show_status() {
    echo -e "${BOLD}Статус сервісів:${NC}"
    echo ""

    if docker info >/dev/null 2>&1 && docker compose ps --status running 2>/dev/null | grep -q wms-postgres; then
        echo -e "  PostgreSQL:  ${GREEN}● працює${NC} (Docker, :5432)"
    else
        echo -e "  PostgreSQL:  ${RED}○ зупинено${NC}"
    fi

    if curl -sf http://127.0.0.1:8000/health >/dev/null 2>&1; then
        echo -e "  Backend:     ${GREEN}● працює${NC} (http://localhost:8000)"
    else
        echo -e "  Backend:     ${RED}○ зупинено${NC}"
    fi

    if curl -sf http://127.0.0.1:3000/ >/dev/null 2>&1; then
        echo -e "  Frontend:    ${GREEN}● працює${NC} (http://localhost:3000)"
    else
        echo -e "  Frontend:    ${RED}○ зупинено${NC}"
    fi

    echo ""
    echo -e "  Логи: ${BOLD}backend/backend.log${NC}, ${BOLD}frontend/frontend.log${NC}"
    echo ""
    echo -e "${YELLOW}Натисніть Enter...${NC}"
    read
}

seed_db() {
    check_docker || { echo -e "${YELLOW}Enter...${NC}"; read; return; }

    echo -e "${CYAN}Запускаємо PostgreSQL та наповнюємо базу...${NC}"
    docker compose up -d
    wait_for_postgres || { echo -e "${YELLOW}Enter...${NC}"; read; return; }

    ensure_backend_deps
    run_db_migrations || { echo -e "${YELLOW}Enter...${NC}"; read; return; }
    cd "$ROOT/backend"
    # shellcheck disable=SC1091
    source .venv/bin/activate
    if ! ALLOW_SEED=1 python3 -m app.seed; then
        echo -e "${RED}❌ Seed не вдався.${NC}"
        cd "$ROOT"
        echo -e "${YELLOW}Enter...${NC}"
        read
        return
    fi
    cd "$ROOT"

    echo ""
    echo -e "${GREEN}✅ Базу даних успішно заповнено!${NC}"
    show_credentials
    echo -e "${YELLOW}Натисніть Enter...${NC}"
    read
}

run_tests() {
    ensure_backend_deps
    cd "$ROOT/backend"
    # shellcheck disable=SC1091
    source .venv/bin/activate
    echo -e "${CYAN}Запускаємо pytest...${NC}"
    pytest tests/ -v --tb=short
    cd "$ROOT"
    echo ""
    echo -e "${YELLOW}Натисніть Enter...${NC}"
    read
}

view_logs() {
    show_header
    echo -e "  ${GREEN}[1]${NC} Backend log  (backend/backend.log)"
    echo -e "  ${GREEN}[2]${NC} Frontend log (frontend/frontend.log)"
    echo -e "  ${GREEN}[3]${NC} Обидва (tail -f)"
    echo ""
    read -p "Вибір: " logchoice
    case $logchoice in
        1) less +G "$ROOT/backend/backend.log" 2>/dev/null || echo "Лог порожній" ;;
        2) less +G "$ROOT/frontend/frontend.log" 2>/dev/null || echo "Лог порожній" ;;
        3)
            echo -e "${CYAN}Ctrl+C щоб вийти${NC}"
            tail -f "$ROOT/backend/backend.log" "$ROOT/frontend/frontend.log" 2>/dev/null
            ;;
    esac
}

start_system() {
    check_docker || { echo -e "${YELLOW}Enter...${NC}"; read; return; }

    # Зупиняємо лише app-сервери, Docker залишаємо
    kill_by_pidfile "$BACKEND_PID"
    kill_by_pidfile "$FRONTEND_PID"
    kill_port 8000
    kill_port 3000

    echo -e "${CYAN}[1/4] PostgreSQL (Docker)...${NC}"
    docker compose up -d
    wait_for_postgres || { echo -e "${YELLOW}Enter...${NC}"; read; return; }

    echo -e "${CYAN}[2/4] Залежності та міграції БД...${NC}"
    ensure_backend_deps
    run_db_migrations || { echo -e "${YELLOW}Enter...${NC}"; read; return; }
    ensure_seed_data || { echo -e "${YELLOW}Enter...${NC}"; read; return; }
    ensure_frontend_deps

    echo -e "${CYAN}[3/4] Backend FastAPI (:8000, auto-reload)...${NC}"
    cd "$ROOT/backend"
    # shellcheck disable=SC1091
    source .venv/bin/activate
    nohup python3 -m uvicorn app.main:app \
        --host 0.0.0.0 --port 8000 --reload \
        > backend.log 2>&1 &
    echo $! > "$BACKEND_PID"
    cd "$ROOT"

    echo -e "${CYAN}[4/4] Frontend Vite (:3000)...${NC}"
    cd "$ROOT/frontend"
    nohup npm run dev -- --host 0.0.0.0 --port 3000 --strictPort \
        > frontend.log 2>&1 &
    echo $! > "$FRONTEND_PID"
    cd "$ROOT"

    echo -e "${CYAN}   Перевірка health...${NC}"
    local ok=0
    local i be_code fe_code
    for i in {1..20}; do
        be_code=$(curl --max-time 2 -sf -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/health 2>/dev/null || echo "fail")
        fe_code=$(curl --max-time 2 -sf -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/ 2>/dev/null || echo "fail")
        if [ "$be_code" = "200" ] && [ "$fe_code" = "200" ]; then
            ok=1
            break
        fi
        sleep 1
    done

    show_header
    if [ "$ok" -eq 1 ]; then
        echo -e "${GREEN}✅ ВСІ СЕРВІСИ ЗАПУЩЕНО!${NC}"
    else
        echo -e "${YELLOW}⚠️  Сервіси запускаються... перевір логи якщо сайт не відкривається.${NC}"
    fi
    echo ""
    show_urls
    show_credentials
    echo -e " 📋 ${BOLD}Логи:${NC} backend/backend.log, frontend/frontend.log"
    echo -e "${CYAN}==============================================================================${NC}"
    echo -e "${MAGENTA}Сервіси працюють у фоні. Можеш закрити це вікно — сайт залишиться доступним.${NC}"
    echo -e "${MAGENTA}Зупинити: меню → [3] Зупинити сервери${NC}"
    echo ""

    open http://localhost:3000 2>/dev/null || true

    echo -e "${YELLOW}Натисніть Enter щоб повернутись до меню...${NC}"
    read
}

# ─── Main menu ───────────────────────────────────────────────────────────────

while true; do
    show_header
    echo -e "Оберіть опцію:"
    echo ""
    echo -e "  ${GREEN}[1]${NC} 🚀 Запустити систему (Docker + Backend + Frontend)"
    echo -e "  ${YELLOW}[2]${NC} 🔧 Наповнити базу даних (seed — виправляє логін)"
    echo -e "  ${CYAN}[3]${NC} 🛑 Зупинити backend і frontend (Docker лишається)"
    echo -e "  ${RED}[4]${NC} ⏹  Зупинити ВСЕ (включно з PostgreSQL)"
    echo -e "  ${CYAN}[5]${NC} 📊 Статус сервісів"
    echo -e "  ${CYAN}[6]${NC} 📋 Переглянути логи"
    echo -e "  ${CYAN}[7]${NC} 🧪 Запустити тести (pytest)"
    echo -e "  ${CYAN}[8]${NC} 🚪 Вийти"
    echo ""
    read -p "Ваш вибір: " choice

    case $choice in
        1) start_system ;;
        2) seed_db ;;
        3) stop_apps; echo -e "${YELLOW}Enter...${NC}"; read ;;
        4) stop_everything; echo -e "${YELLOW}Enter...${NC}"; read ;;
        5) show_status ;;
        6) view_logs ;;
        7) run_tests ;;
        8) exit 0 ;;
        *) echo -e "${RED}Невірний вибір!${NC}"; sleep 1 ;;
    esac
done
