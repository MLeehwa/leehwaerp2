# MongoDB Atlas 설정 가이드

## 1. MongoDB Atlas 가입 및 클러스터 생성

1. https://www.mongodb.com/cloud/atlas/register 접속
2. 무료 계정 생성 (이메일 인증)
3. "Build a Database" 클릭
4. "FREE" (M0) 선택
5. 클라우드 제공자 및 지역 선택 (가장 가까운 지역 선택)
6. 클러스터 이름 입력 (예: "ERP-Cluster")
7. "Create" 클릭

## 2. 데이터베이스 접근 설정

1. "Database Access" 메뉴 클릭
2. "Add New Database User" 클릭
3. Authentication Method: "Password" 선택
4. Username과 Password 입력 (기억해두세요!)
5. Database User Privileges: "Atlas admin" 선택
6. "Add User" 클릭

## 3. 네트워크 접근 설정

1. "Network Access" 메뉴 클릭
2. "Add IP Address" 클릭
3. "Allow Access from Anywhere" 선택 (또는 현재 IP 주소 입력)
4. "Confirm" 클릭

## 4. 연결 문자열 복사

1. "Database" 메뉴로 돌아가기
2. "Connect" 버튼 클릭
3. "Connect your application" 선택
4. Driver: "Node.js", Version: "5.5 or later" 선택
5. 연결 문자열 복사 (예: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`)

## 5. .env 파일 업데이트

`backend/.env` 파일을 열고 연결 문자열을 업데이트:

```
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/erp-system?retryWrites=true&w=majority
```

**중요:** 
- `username`과 `password`를 2단계에서 만든 계정 정보로 변경
- 데이터베이스 이름을 `/erp-system`으로 지정

## 6. 관리자 계정 생성

```bash
npm run seed
```

이제 MongoDB Atlas를 사용하여 시스템을 실행할 수 있습니다!

