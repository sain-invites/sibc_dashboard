# Service Overview Dashboard 디자인 아이디어

## 프로젝트 개요
PostgreSQL 데이터베이스 기반 서비스 운영 현황을 한눈에 파악하는 대시보드. 
KPI 카드 8개, 추이 차트 3개, 분해 차트 3개로 구성.

---

<response>
<text>
## Idea 1: Data Observatory (데이터 관측소)

### Design Movement
**Astronomical/Observatory Aesthetic** - 우주 관측소에서 데이터를 모니터링하는 느낌. 어두운 배경에 빛나는 데이터 포인트들이 별처럼 반짝이는 콘셉트.

### Core Principles
1. **Dark Canvas, Bright Data**: 깊은 남색/차콜 배경 위에 형광 계열 액센트로 데이터 강조
2. **Radial Information Architecture**: 원형 게이지, 호(arc) 차트를 적극 활용한 비선형 레이아웃
3. **Ambient Glow Effects**: 중요 지표에 은은한 glow 효과로 시선 유도
4. **Layered Depth**: 카드들이 공간에 떠 있는 듯한 다층 구조

### Color Philosophy
- **Primary Background**: #0F1419 (깊은 우주 검정)
- **Secondary Background**: #1A2332 (밤하늘 남색)
- **Accent Cyan**: #00D9FF (데이터 포인트, 성공 지표)
- **Accent Amber**: #FFB800 (경고, 주의 지표)
- **Accent Rose**: #FF4D6A (에러, 위험 지표)
- **Muted Text**: #8899AA (보조 텍스트)

### Layout Paradigm
- 상단: 원형 KPI 게이지 8개가 호 형태로 배열
- 중앙: 메인 추이 차트가 전체 너비 차지, 배경에 그리드 라인
- 하단: 3개 분해 차트가 카드 형태로 floating

### Signature Elements
1. **Glowing Data Points**: 차트 포인트에 blur glow 효과
2. **Circular Progress Rings**: KPI를 원형 진행률로 표현
3. **Grid Overlay**: 관측소 스크린 느낌의 미세한 그리드 패턴

### Interaction Philosophy
- 호버 시 데이터 포인트가 pulse 애니메이션으로 확대
- 카드 선택 시 다른 카드들이 dim 처리되며 포커스 강조
- 드릴다운 시 zoom-in 트랜지션

### Animation
- 페이지 로드 시 KPI 게이지가 0에서 목표값까지 채워지는 애니메이션
- 차트 라인이 왼쪽에서 오른쪽으로 그려지는 효과
- 숫자 카운트업 애니메이션 (easeOutExpo)

### Typography System
- **Display**: Space Grotesk (기하학적, 미래적)
- **Body**: Inter (가독성)
- **Monospace**: JetBrains Mono (숫자, 코드)
</text>
<probability>0.08</probability>
</response>

---

<response>
<text>
## Idea 2: Clinical Dashboard (임상 대시보드)

### Design Movement
**Medical/Clinical Aesthetic** - 헬스케어 서비스 특성을 반영한 깔끔하고 신뢰감 있는 의료 계기판 스타일. 정확성과 명확성을 최우선으로.

### Core Principles
1. **Clinical Precision**: 데이터의 정확한 전달이 최우선, 장식 최소화
2. **Status-Driven Color**: 색상은 오직 상태(정상/주의/위험)를 나타내는 데만 사용
3. **Scannable Layout**: 의료진이 빠르게 스캔할 수 있는 좌→우, 상→하 읽기 흐름
4. **High Contrast Readability**: 어떤 조명에서도 읽기 쉬운 대비

### Color Philosophy
- **Background**: #FAFBFC (의료 기기 스크린 화이트)
- **Card Surface**: #FFFFFF (순백 카드)
- **Primary Text**: #1A1D21 (고대비 검정)
- **Success/Normal**: #10B981 (생체 신호 녹색)
- **Warning**: #F59E0B (주의 황색)
- **Critical**: #EF4444 (위험 적색)
- **Border/Divider**: #E5E7EB (미세한 구분선)

### Layout Paradigm
- **Top Bar**: 기간 필터 + 마지막 업데이트 시간 + 새로고침
- **KPI Row**: 8개 카드가 2행 4열 그리드로 정렬, 각 카드에 상태 인디케이터
- **Charts Section**: 3열 그리드로 추이 차트 배치
- **Bottom Section**: 분해 차트 3개 탭 또는 아코디언

### Signature Elements
1. **Status Indicator Dots**: 각 KPI 좌상단에 녹/황/적 상태 점
2. **Trend Arrows**: 전일 대비 상승/하락 화살표
3. **Threshold Lines**: 차트에 정상 범위를 나타내는 점선

### Interaction Philosophy
- 최소한의 애니메이션, 즉각적인 반응
- 클릭 시 상세 모달이 슬라이드 인
- 키보드 네비게이션 완벽 지원

### Animation
- 데이터 로딩 시 스켈레톤 UI
- 값 변경 시 부드러운 숫자 트랜지션 (150ms)
- 상태 변경 시 카드 테두리 색상 페이드

### Typography System
- **Display**: IBM Plex Sans (의료/과학적 신뢰감)
- **Body**: IBM Plex Sans (일관성)
- **Monospace**: IBM Plex Mono (정밀한 숫자 표현)
</text>
<probability>0.06</probability>
</response>

---

<response>
<text>
## Idea 3: Command Center (지휘 센터)

### Design Movement
**Mission Control / War Room Aesthetic** - NASA 미션 컨트롤이나 군사 지휘소에서 영감받은 디자인. 다크 모드 기반으로 장시간 모니터링에 적합하며, 정보 밀도가 높으면서도 체계적.

### Core Principles
1. **Information Density**: 한 화면에 최대한 많은 정보를 효율적으로 배치
2. **Hierarchical Urgency**: 긴급도에 따른 시각적 계층 (Critical → Warning → Normal)
3. **Persistent Context**: 현재 상태가 항상 화면 어딘가에 표시
4. **Modular Panels**: 드래그로 재배치 가능한 패널 구조

### Color Philosophy
- **Background**: #0D1117 (GitHub Dark 스타일)
- **Panel Surface**: #161B22 (약간 밝은 패널)
- **Border**: #30363D (미묘한 구분)
- **Primary Accent**: #58A6FF (링크, 액션)
- **Success**: #3FB950 (정상 상태)
- **Warning**: #D29922 (주의)
- **Danger**: #F85149 (위험)
- **Text Primary**: #C9D1D9
- **Text Secondary**: #8B949E

### Layout Paradigm
- **Header Strip**: 로고 + 대시보드 제목 + 기간 필터 + 실시간 시계
- **Left Sidebar**: KPI 카드 8개 세로 스택 (컴팩트 모드)
- **Main Area**: 추이 차트 3개 세로 배열, 각 차트가 전체 너비 활용
- **Right Panel**: 분해 차트 (탭으로 전환) + 최근 알림 피드

### Signature Elements
1. **Live Pulse Indicator**: 실시간 데이터 연결 상태 표시 (녹색 점 깜빡임)
2. **Severity Badges**: 각 지표에 CRITICAL/WARNING/OK 배지
3. **Mini Sparklines**: KPI 카드 내 7일 미니 추이 그래프

### Interaction Philosophy
- 패널 헤더 드래그로 크기 조절
- 더블클릭으로 패널 최대화/복원
- 우클릭 컨텍스트 메뉴로 빠른 액션

### Animation
- 새 데이터 도착 시 해당 영역 subtle flash
- 상태 변경 시 배지 색상 transition (300ms)
- 패널 리사이즈 시 smooth resize animation

### Typography System
- **Display**: Geist Sans (현대적, 기술적)
- **Body**: Geist Sans (일관성)
- **Monospace**: Geist Mono (터미널 느낌의 숫자)
</text>
<probability>0.07</probability>
</response>

---

## 선택: Idea 3 - Command Center (지휘 센터)

### 선택 이유
1. **서비스 특성 부합**: 헬스케어 서비스의 운영 모니터링이라는 목적에 "지휘 센터" 콘셉트가 적합
2. **정보 밀도**: KPI 8개 + 추이 3개 + 분해 3개를 효과적으로 배치 가능
3. **장시간 모니터링**: 다크 모드 기반으로 눈의 피로 감소
4. **확장성**: 추후 다른 대시보드(Adoption, Routine Performance 등) 추가 시 일관된 디자인 시스템 적용 가능
5. **전문성**: 운영팀이 사용하는 도구로서 전문적이고 신뢰감 있는 인상

### 구현 시 핵심 포인트
- Geist 폰트 적용 (Google Fonts에서 사용 가능)
- GitHub Dark 스타일 컬러 팔레트
- 사이드바 + 메인 영역 레이아웃
- 각 KPI에 미니 스파크라인 포함
- 상태별 색상 코딩 (Success/Warning/Danger)
