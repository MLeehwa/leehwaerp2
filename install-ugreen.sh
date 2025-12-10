#!/bin/bash

# UGREEN NAS MongoDB 설치 스크립트
# 사용법: bash install-ugreen.sh

echo "=========================================="
echo "UGREEN NAS MongoDB 설치 스크립트"
echo "=========================================="

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Docker 설치 확인
echo -e "\n${YELLOW}[1/5] Docker 설치 확인 중...${NC}"
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓ Docker가 설치되어 있습니다.${NC}"
    docker --version
else
    echo -e "${RED}✗ Docker가 설치되어 있지 않습니다.${NC}"
    echo "Docker 설치 방법:"
    echo "  - UGREEN NAS 앱 센터에서 'Docker' 또는 'Container Station' 설치"
    echo "  - 또는 SSH에서: opkg install docker"
    exit 1
fi

# 2. Docker Compose 확인
echo -e "\n${YELLOW}[2/5] Docker Compose 확인 중...${NC}"
if command -v docker-compose &> /dev/null; then
    echo -e "${GREEN}✓ Docker Compose가 설치되어 있습니다.${NC}"
    docker-compose --version
else
    echo -e "${YELLOW}⚠ Docker Compose가 없습니다. 설치 시도...${NC}"
    if command -v opkg &> /dev/null; then
        opkg install docker-compose
    else
        echo -e "${RED}✗ Docker Compose를 수동으로 설치해주세요.${NC}"
        exit 1
    fi
fi

# 3. 프로젝트 폴더 확인
echo -e "\n${YELLOW}[3/5] 프로젝트 폴더 확인 중...${NC}"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}✗ docker-compose.yml 파일을 찾을 수 없습니다.${NC}"
    exit 1
fi

COMPOSE_FILE="docker-compose.yml"
echo -e "${GREEN}✓ docker-compose.yml 파일을 사용합니다.${NC}"

# 4. 비밀번호 확인
echo -e "\n${YELLOW}[4/5] 보안 설정 확인 중...${NC}"
if grep -q "your_secure_password_here" "$COMPOSE_FILE"; then
    echo -e "${RED}⚠ 경고: 기본 비밀번호를 사용하고 있습니다!${NC}"
    echo "docker-compose.yml 파일에서 비밀번호를 변경해주세요:"
    echo "  - MONGO_INITDB_ROOT_PASSWORD"
    echo "  - ME_CONFIG_MONGODB_ADMINPASSWORD"
    read -p "계속하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✓ 비밀번호가 설정되어 있습니다.${NC}"
fi

# 5. 데이터 폴더 생성
echo -e "\n${YELLOW}[5/5] 데이터 폴더 준비 중...${NC}"
mkdir -p ./data/mongodb
chmod 755 ./data/mongodb
echo -e "${GREEN}✓ 데이터 폴더가 준비되었습니다.${NC}"

# 6. Docker Compose 실행
echo -e "\n${GREEN}=========================================="
echo "MongoDB 컨테이너 시작 중..."
echo "==========================================${NC}\n"

docker-compose -f "$COMPOSE_FILE" up -d

# 7. 상태 확인
echo -e "\n${YELLOW}컨테이너 상태 확인 중...${NC}"
sleep 5
docker-compose -f "$COMPOSE_FILE" ps

# 8. 연결 테스트
echo -e "\n${YELLOW}MongoDB 연결 테스트 중...${NC}"
sleep 10

if docker exec erp-mongodb mongosh --eval "db.runCommand('ping')" --quiet &> /dev/null; then
    echo -e "${GREEN}✓ MongoDB가 정상적으로 실행 중입니다!${NC}"
else
    echo -e "${YELLOW}⚠ MongoDB 연결 테스트 실패. 로그를 확인하세요.${NC}"
    echo "로그 확인: docker-compose -f $COMPOSE_FILE logs mongodb"
fi

# 9. 완료 메시지
echo -e "\n${GREEN}=========================================="
echo "설치 완료!"
echo "==========================================${NC}"
echo ""
echo "MongoDB 접속 정보:"
echo "  - 호스트: localhost (또는 NAS IP)"
echo "  - 포트: 27017"
echo "  - 사용자: admin"
echo "  - 비밀번호: (docker-compose.yml에 설정한 값)"
echo ""
echo "MongoDB Express (웹 관리 도구):"
echo "  - URL: http://$(hostname -I | awk '{print $1}'):8081"
echo "  - 사용자: admin"
echo "  - 비밀번호: admin123"
echo ""
echo "유용한 명령어:"
echo "  - 로그 확인: docker-compose -f $COMPOSE_FILE logs -f mongodb"
echo "  - 중지: docker-compose -f $COMPOSE_FILE stop"
echo "  - 시작: docker-compose -f $COMPOSE_FILE start"
echo "  - 재시작: docker-compose -f $COMPOSE_FILE restart"
echo ""

