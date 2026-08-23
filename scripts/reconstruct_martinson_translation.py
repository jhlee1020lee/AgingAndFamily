import json
import re
from collections import Counter
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent
SLUG = "martinson-berridge-2015"
CONTENT_DIR = ROOT_DIR / "content" / "readings" / SLUG
SOURCE_PATH = CONTENT_DIR / "full.md"
SOURCE_SEGMENTS_PATH = CONTENT_DIR / "source_segments.json"
TRANSLATION_PATH = CONTENT_DIR / "translation.md"
TRANSLATION_SEGMENTS_PATH = CONTENT_DIR / "translation_segments.json"


HEADING_TRANSLATIONS = {
    "# Successful Aging and Its Discontents: A Systematic Review of the Social Gerontology Literature": "# 성공적 노화와 그에 대한 불만: 사회노년학 문헌의 체계적 고찰",
    "## Abstract": "## 초록",
    "## Key Words": "## 핵심어",
    "## Introduction": "## 서론",
    "## Methods": "## 방법",
    "## Findings": "## 연구 결과",
    "### Theme 1: Add and Stir": "### 주제 1: 추가하고 섞기",
    "#### A Prevalence Problem": "#### 유병률의 문제",
    "#### Additional Criteria": "#### 추가 기준",
    "### Theme 2: The Missing Voices": "### 주제 2: 누락된 목소리",
    "#### Compare and Contrast": "#### 비교와 대조",
    "#### Cultural Relevance and Variability": "#### 문화적 적합성과 다양성",
    "### Theme 3: Hard Hitting Critiques": "### 주제 3: 통렬한 비판",
    "#### Individualism": "#### 개인주의",
    "#### Ageism and Ableism": "#### 연령주의와 비장애 중심주의",
    "#### Neoliberal and Conservative Contexts": "#### 신자유주의적·보수주의적 맥락",
    "#### Influences, Applications, and Internalizations": "#### 영향, 적용, 내면화",
    "#### Alternative Approaches for Social Justice": "#### 사회정의를 위한 대안적 접근",
    "### Theme 4: New Frames and Names": "### 주제 4: 새로운 틀과 명칭",
    "## Discussion": "## 논의",
    "## Limitations": "## 한계",
    "## Conclusion": "## 결론",
    "## References": "## 참고문헌",
}


# One Korean block for each non-heading, non-reference source block, in exact
# Markdown order. Block boundaries are intentionally parallel to full.md so
# original-text reveal and sentence alignment stay deterministic.
TRANSLATED_BLOCKS = [
    "> Marty Martinson, DrPH*,¹ · Clara Berridge, MSW²",
    "> ¹ 샌프란시스코주립대학교 보건교육학과, 캘리포니아. ² 캘리포니아대학교 버클리캠퍼스 사회복지대학원.",
    "> *The Gerontologist*, 55(1), 58–69 (2015). DOI: 10.1093/geront/gnu037. 연구논문; 특별호: 성공적 노화. 2014년 5월 9일 온라인 선게재.",
    "> 2014년 1월 10일 접수; 2014년 3월 28일 게재 승인. 담당 편집자: Rachel Pruchno, PhD.",
    "> 교신저자: Marty Martinson, DrPH, Department of Health Education, San Francisco State University, 1600 Holloway Avenue, HSS Building, Room 326, San Francisco, CA 94132. 이메일: martym@sfsu.edu.",
    "> © 저자 2014. 미국노년학회를 대신하여 Oxford University Press가 출판함. 모든 권리 보유. 허가 문의 이메일: journals.permissions@oup.com.",
    "**연구 목적.** 본 연구의 목적은 사회노년학 문헌에 나타난 성공적 노화 모델에 대한 비판의 범위와 개선 제안을 분석하는 것이었다.",
    "**설계 및 방법.** 다음 기준을 사용하여 체계적 문헌고찰을 수행했다. *Abstracts in Social Gerontology*에서 검색된 학술지 논문, 1987–2013년 출판, 제목이나 본문 전체에 successful aging/ageing 포함(n = 453), 성공적 노화 모델에 대한 비판이 논문의 핵심 요소일 것. 이 기준을 충족한 논문은 67편이었다. 질적 방법을 사용하여 핵심 주제를 확인하고 비판 전반에 걸친 의미를 귀납적으로 구성했다.",
    "**결과.** 비판과 개선책은 4개 범주로 나뉘었다. ‘추가하고 섞기’ 집단은 성공적 노화 기준을 다차원적으로 확장하자고 제안하며 여러 요소를 추가했다. ‘누락된 목소리’ 집단은 기존의 객관적 측정치에 노인들이 부여하는 성공적 노화의 주관적 의미를 더해야 한다고 주장했다. ‘통렬한 비판’ 집단은 다양성을 포용하고 낙인과 차별을 피하며 노화의 구조적 맥락에 개입하는, 더 정의롭고 포괄적인 틀을 요구했다. ‘새로운 틀과 명칭’ 집단은 흔히 동양철학에 토대를 둔 대안적 이상 모델을 제시했다.",
    "**함의.** 노년학자들이 Rowe와 Kahn의 원래 성공적 노화 모델을 확장하려고 집합적으로 제시한 방대한 기준은 규범적 모델이 정의상 배제적이라는 문제의 징후다. 노년학이 ‘성공적 노화’와 그 밖의 규범적 모델을 사용하는 방식에 관해 더 큰 성찰성이 필요하다.",
    "성공적 노화, 사회노년학, 비판적 노년학",
    "성공적 노화는 현재 사회노년학 연구에서 두드러진 위치를 차지한다(Alley, Putney, Rice, & Bengtson, 2010). 이 모델은 Rowe와 Kahn이 ‘통상적’ 노화와 ‘성공적’ 노화를 구분한 뒤(1987), 성공적 노화의 세 가지 핵심 요소인 질병과 장애의 회피, 인지·신체 기능의 유지, 사회적 참여를 후속 연구에서 구체화하면서(1997) 갈수록 인기를 얻었다. 지난 20년 동안 성공적 노화에 이를 수 있는 과정을 설명하는 모델들이 개발되면서 성공적 노화 연구는 이러한 최종상태 기준을 넘어 확장되었다(성공적 노화 모델의 역사는 Pruchno, Wilson-Genderson, Rose, & Cartwright, 2010 참조). Villar(2012)의 설명에 따르면 Rowe와 Kahn의 모델은 “잘 늙는 것의 달성을 결정하는 생물학적·행동적·사회적 요인에 대한 관심을 촉진했고, 생애 마지막 수십 년을 바라보는 새롭고 예방적이며 낙관적인 접근의 채택을 장려했다”(p. 1089). 시간이 지나면서 성공적 노화는 매우 다양한 방식으로 수정되고 해석되어, 이제 이 개념에 합의된 정의가 없다는 점이 널리 인정될 정도가 되었다(Bowling & Iliffe, 2006; Ferri, James, & Pruchno, 2009; McLaughlin, Jette, & Connell, 2012). 그럼에도 성공적 노화는 사회노년학 연구에서 이 분야를 지배하는 이론들만큼 자주 등장한다(Alley et al., 2010).",
    "성공적 노화 모델은 두드러진 위치를 차지해 왔지만 논쟁의 대상이기도 했다. Rowe와 Kahn 모델에 대한 초기 비판 가운데 하나는 1998년 *The Gerontologist*의 편집자에게 보낸 편지에 실렸다. 사회노년학자 Matilda Riley는 개인의 성공에만 초점을 맞추고 노화에 영향을 미치는 구조적·사회적 요인을 무시한다는 이유로 이 모델을 “심각하게 불완전하다”(p. 151)고 평했다. 20년이 넘는 기간 동안 사회노년학자들은 성공적 노화가 노화의 개인적·사회적·경제적·정치적 맥락을 포착한 방식과 포착하지 못한 방식을 두고 고심해 왔다. 성공적 노화의 틀에 대한 문제 제기는 사소한 수정을 제안하는 것부터 이 구성개념에 내재한 핵심 이데올로기를 더 근본적으로 비판하는 것까지 폭넓다.",
    "Cole(1995)은 “지적으로 풍부한 사회노년학의 성장은 경험연구, 해석, 비판적 평가, 성찰적 지식 사이의 더 큰 상호작용을 계속 촉진하려는 의지에 달려 있다”(p. S343)고 지적했다. 본 연구는 성공적 노화가 1987년에 도입된 뒤 제기된 비판적 질문을 일관된 하나의 요약으로 구성함으로써 이러한 ‘더 큰 상호작용’을 구축하는 데 한 걸음 나아간다. 성공적 노화에 관해 출판된 연구 대부분은 모델의 개요와 하나 이상의 성공적 노화 틀에 존재하는 공백이나 약점에 대한 언급을 포함하지만, 이 개념에 관해 시간에 걸쳐 표현된 우려와 비판의 전체 범위를 아직 체계적으로 고찰한 적은 없다. 이러한 고찰은 성찰적 지식을 더욱 발전시키는 데 유용할 수 있다. 성공적 노화에 대한 비판의 범위를 확인하고 분석함으로써 우리는 Cole이 말한 지적으로 풍부한 사회노년학을 더 잘 촉진하고, 사람들이 나이 들어 가는 과정을 뒷받침하는 실천과 정책으로 이어지는 역동적인 노화과학을 한층 발전시킬 수 있을 것이다. 이를 위해 성공적 노화 문헌을 체계적으로 고찰하여 다음 질문에 답하고자 했다. 1987년 이후 출판된 사회노년학 문헌에서 성공적 노화 모델에 관해 어떤 우려가 제기되었고, 어떤 개선안이 제시되었는가?",
    "이 체계적 문헌고찰에서는 1987년 1월부터 2013년 12월까지 *Abstracts in Social Gerontology*(ASG) 데이터베이스에 수록된 동료심사 논문을 검토했다. 물론 성공적 노화에 관한 주목할 만한 비판 중에는 ASG 데이터베이스에 포함되지 않은 학술 출판물에 실린 것도 있다(Belgrave & Sayed, 2013; Calasanti, Slevin, & King, 2006; Katz, 2013). 그러나 ASG가 노화에 관한 생물학적·심리학적·사회학적·경제적·문화적·비판적 연구 등을 포함하여 사회노년학의 폭넓은 학제간 연구를 제공했기 때문에 검색 범위를 ASG로 좁혔다. 제목이나 본문 전체에 successful aging/ageing이 들어간 논문을 검색한 뒤(n = 453), 성공적 노화 모델에 대한 비판을 핵심 요소로 포함한 논문을 선정했다. 앞의 기준으로 경험연구, 이론적 분석, 사설을 포함한 논문 67편을 확인했다.",
    "구성적 문헌고찰로서 자료를 분석하는 데 질적 방법을 사용하여 성공적 노화에 관한 비판 전반의 핵심 주제를 확인하고 의미를 귀납적으로 구성했다(Gough, Oliver, & Thomas, 2012). 먼저 각 논문이 제기한 성공적 노화 비판의 핵심 논점과 개선된 모델을 위한 제안을 명명하는 초기 코딩을 실시했다. 두 번째 축코딩에서는 코드 전반의 핵심 주제를 귀납적으로 확인한 뒤, 더 높은 추상화 수준을 나타내는 주제 간의 폭넓은 연결을 명명했다. 평가자 간 신뢰도를 높이기 위해 두 저자가 각각 논문 15편의 하위집합을 코딩하고 만나서 분석을 논의·비교하며 공통 코드를 확인했다. 논문을 핵심 주제 집단으로 분류할 때도 같은 절차를 거쳤으며, 코드와 범주가 명확하게 정의되었다고 확신한 뒤 분석을 계속했다.",
    "범주가 다른 논문들은 성공적 노화에 대한 비판에서 때때로 서로 겹쳤지만(예: 노화의 생리적 측면에 대한 초점, 기준의 문화적 편향과 한계, 장애나 질병이 있는 사람에 대한 폄하), 그러한 결점을 해결하기 위해 제시한 권고를 기준으로 서로 구별되는 범주에 배치했다. 네 범주, 즉 ‘추가하고 섞기’, ‘누락된 목소리’, ‘통렬한 비판’, ‘새로운 틀과 명칭’이 도출되었다. 분석의 마지막 단계에서는 이 범주들을 종합하여 이 연구군이 사회노년학과 성공적 노화의 관계에 관해 무엇을 시사하는지 설명했다.",
    "검토한 논문 67편 중 16편은 성공적 노화가 하나의 모델로 존립할 수 있다는 생각을 받아들였지만, 현재 모델에서 여러 공백을 확인했다. 이 비판에서는 두 종류의 해결책이 나왔다. 기존 기준으로 측정한 성공적 노화의 유병률이 매우 낮다는 점을 고려해 기준을 완화하는 것과, 빠진 기준을 추가하여 모델을 확장하는 것이다. 성공적 노화 모델을 기준선으로 유지하면서 공백을 메우기 위해 수많은 요소를 추가했기 때문에, 이 비판들은 일종의 ‘추가하고 섞기’ 접근을 취했다.",
    "Bowling과 Iliffe(2006)는 문헌에서 찾은 기준으로 구성한 생의학 모델, 확장된 생의학 모델, 사회기능 모델, 심리자원 모델, 일반인 모델을 사용하여 영국의 성공적 노화 유병률을 조사했고, 그 결과 16%–24%의 비율을 보고했다. 이와 비슷하게 McLaughlin, Connell, Heeringa, Li, Roberts(2010)는 *Health and Retirement Survey*의 네 시점 자료를 사용하여 Rowe와 Kahn의 모델에 따른 성공적 노화 유병률을 계산했으며, 어느 해에도 65세 이상 인구 가운데 기준을 충족한 사람은 11.9%를 넘지 않았다. 후속 연구는 갈수록 완화된 기준을 비교하여 3.3%–33.5%의 유병률을 확인했다(McLaughlin et al., 2012). 연구자들은 “거의 완벽하게 건강한 사람으로 건강한 노화 연구를 한정하려는 것이 아니라면”(p. 787), 성공적 노화 기준이 공중보건 목적으로 사용하기에는 너무 협소하다는 우려를 제기했다. McLaughlin과 동료들은 Rowe와 Kahn 모델의 토대를 유지하면서 문턱을 낮추거나 기준을 완화할 것을 권고했다.",
    "Hank(2011)는 유럽 국가들과 이스라엘을 비교하면서 McLaughlin과 동료들(2010)의 연구를 반복했다. 그는 미국의 11.9%라는 비율이 다른 국가들의 중간 수준에 해당한다는 사실을 확인했다. 국가의 소득불평등은 성공적 노화의 낮은 비율과 정적 관련이 있었고, 복지국가는 성공적 노화를 가능하게 하거나 방해하는 데 일정한 역할을 하는 것으로 보였다. Hank(2011)는 Rowe와 Kahn의 기준을 완화하는 일의 가치를 인정하면서 “개인이 성공적으로 노화할 기회를 지원하는 정책적 개입”(p. 230)도 요구했다.",
    "여러 학자는 다양한 성공적 노화 모델의 공백을 확인하고 기준을 추가할 것을 권고했다. 다른 연구자들과 마찬가지로 Young, Frick, Phelan(2009)은 Rowe와 Kahn의 성공적 노화 구성개념이 노화의 생리적 측면을 강조한다고 비판했다. 이들은 생리적·심리적·사회적 차원을 포함하는 단계적 접근을 제시했다. Young과 동료들은 성공적 노화를 개인이 신체적·사회적 적응 전략을 사용하여 “질병과 장애가 있는 상황에서도 안녕감, 높은 자기평가 삶의 질, 개인적 성취감을 이루는”(pp. 88–89) 상태로 정의했다. Rowe와 Kahn 모델에 대한 다른 경험적 비판들은 다음 요소를 추가해 모델을 확장할 것을 요구했다. 주관적 기준(Coleman, 1992), 영성(Crowther, Parker, Achenbaum, Larimore, & Koenig, 2002), 혼인상태와 결혼의 질(Ko, Berg, Butner, Uchino, & Smith, 2007), 병리적 특성과 대비되는 긍정적 건강 특성(Kaplan et al., 2008), 인지·정서 상태, 신체건강, 사회기능, 참여, 삶의 만족을 아우르는 더 폭넓은 다차원적 구성개념(Tze Pin, Broekman, Niti, Gwee, & Fe Heok, 2009), 그리고 여가활동(Lee, Lan, & Yen, 2011)이다.",
    "연구자들은 Baltes와 Baltes(1990)의 보상을 수반한 선택적 최적화 성공적 노화 모델도 수정할 것을 제안했다. Steverink, Lindenberg, Ormel(1998)은 사회적 맥락과 행동을 더 잘 통합하기 위해 사회적 생산기능 이론을 제안했다. 더 최근에 Villar(2012)는 사회·지역사회·개인 발달을 포함하는 다면적 생성감 개념을 성공적 노화의 기준에 불어넣자고 제안했다. 그는 이득이 손실과 공존하며, 손실의 조절이나 유지뿐 아니라 생성도 성공적 노화에 포함해야 한다고 주장했다.",
    "성공적 노화 모델에 대한 비판 67편 가운데 거의 절반인 30편은 ‘누락된 목소리’, 곧 노인들이 내리는 성공적 노화의 주관적 정의에 초점을 맞췄다. ‘추가하고 섞기’ 집단과 마찬가지로 이 저자들은 성공적 노화 기준이 협소하다고 비판했다. 그러나 ‘추가하고 섞기’의 비판과 달리, 이 집단은 노인의 관점에서 도출한 성공적 노화 기준을 추가해야 한다고 명시적으로 주장했다.",
    "성공적 노화에 대한 자기평가 비율과 기존 기준에 따른 비율이 서로 다르다는 점을 고려하여, 여러 연구자는 노인의 주관적 측정에서 생성한 성공적 노화 기준을 추가하라고 요구했다. Strawbridge, Wallhagen, Cohen(2002)은 자기평가와 Rowe와 Kahn 기준에 따른 평가 사이에 유의한 차이(50.3% 대 18.8%)가 있다고 보고했다. Cernin, Lysack, Lichtenberg(2011)도 표본의 아프리카계 미국인 노인 중 63%가 자신이 성공적으로 노화한다고 보고한 데 비해 Rowe와 Kahn의 기준을 충족한 비율은 30%였다고 밝혔다. Phelan, Anderson, LaCroix, Larson(2004) 역시 성공적 노화의 주관적 의미가 출판 문헌의 의미와 다르며, 노인의 다차원적 인식(신체적·기능적·사회적·심리적 건강을 포함)은 어떤 성공적 노화 모델에도 온전히 반영되지 않았음을 확인했다. Manitoba Follow-up Study 자료에 근거한 연구에서는 일반인이 내리는 정의가 시간에 걸쳐 비교적 일관적일 수 있으므로 이를 고려해야 한다고 보았다(Tate, Swift, & Bayomi, 2013). Pruchno, Wilson-Genderson, Cartwright(2010)는 주관적 측정과 객관적 측정으로 이루어진 2부분 모델을 제안했다. 객관적 측정에는 만성질환이 거의 없음, 기능능력 유지, 통증을 거의 경험하지 않음이 포함되었고, 주관적 평정에는 자신이 얼마나 성공적으로 나이 들었는지, 얼마나 잘 나이 들고 있는지, 요즘 자신의 삶을 어떻게 평가하는지가 포함되었다.",
    "세 연구는 장애나 만성 신체질환을 피하는 것이 주관적 성공적 노화를 예측하지 못했다고 보고했다. Strawbridge와 동료들(2002)은 특히 기능상태가 주관적 성공적 노화를 예측하지 못한다는 사실을 확인했다. Montross와 동료들(2006)도 표본의 대다수가 장애와 만성 신체질환을 경험했음에도 92%가 자신이 성공적으로 노화하고 있다고 보았음을 확인했다. Romo와 동료들(2013)은 노년기 장애가 있는 인종·민족적으로 다양한 노인 표본에서 주관적 성공적 노화의 비율을 조사했으며, 대다수는 자신이 성공적으로 노화했다고 보고했다.",
    "객관적 측정과 주관적 측정을 비교한 이 연구군은 현재의 성공적 노화 개념화에 추가해야 할, 주관적으로 정의된 폭넓은 기준을 확인했다. 여기에는 정서적 안녕과 영성의 여러 차원(Lewis, 2011), 처신과 변화의 수용(Rossen, Knafi, & Flood, 2008), 자기수용과 자기만족(Reichstadt, Sengupta, Depp, Palinkas, & Jeste, 2010), 자기돌봄, 노화과정의 수용, 경제적 안녕(Hilton, Gonzalez, Saleh, Maitoza, and Anngela-Cole, 2012), 가족과 함께 살기와 정서적 돌봄 받기(Hsu, 2007)가 포함되었다. 전체적으로 보면 ‘추가하고 섞기’ 집단과 마찬가지로 이 비판 집단도 현재의 성공적 노화 개념화를 강화하기 위해 어지러울 만큼 다양한 누락 요소를 제시했다.",
    "10년이 넘는 기간 동안 연구자들은 성공적 노화 모델의 문화적 폭이 부족하다고 비판하며, 다양한 문화적 관점에서 성공적 노화에 부여하는 주관적 의미를 더 잘 포착해야 한다고 주장해 왔다. Soondool과 Soo-Jung(2008)은 한국의 저소득 노인들이 생각하는 성공적 노화의 의미를 조사한 뒤 ‘성인 자녀의 성공’과 ‘삶에 대한 긍정적 태도’(p. 1061)를 포함한 주관적 기준을 추가로 제안했다. Lewis(2011)는 알래스카 남서부의 알래스카 원주민 원로들을 면접하여, 연구 참여자들이 제시한 문화적으로 부합하는 원로됨(eldership) 개념과 그 네 가지 핵심 요소를 통해 성공적 노화를 가장 잘 정의할 수 있음을 확인했다. Hilton과 동료들(2012)은 지배적 모델이 사용하는 기준에는 없는, 라틴계 노인들이 표현한 문화적으로 배태된 의미를 확인했으며 성공적 노화의 여러 차원과 과정에 관해 더 명료하게 규정할 것을 요구했다.",
    "많은 연구자는 성공적 노화 개념화에 서구·백인·중산층 편향이 있다고 비판했다(Kendig, 2004; Ng et al., 2011). 두 연구는 Rowe와 Kahn(1997) 및 Phelan과 동료들(2004)의 성공적 노화 측정이 일본계 미국인에게 문화적으로 적합한지를 문제 삼았다(Iwamasa & Iwasaki, 2011; Matsubayashi, Ishine, Wada, & Okumiya, 2006). Iwamasa와 Iwasaki(2011)는 기존의 신체적·심리적·사회적·인지적 건강 측정과 폭넓게 유사하지만, 기존 측정과 의미가 다른 문화특수적 차원을 포함한 여섯 요소 모델을 만들었다. 예를 들어 일본계 미국인이 독립성을 바라보는 방식은 개인주의적으로 자기 자신에 초점을 맞추기보다 다른 사람을 집합주의적으로 배려하고 “집단의 조화를 유지하도록 자신의 욕구를 조정하는 것”(p. 274)에 더 초점을 두었다. Iwamasa와 Iwasaki의 모델에는 경제적 안정과 영성이라는 기준도 포함되었다. Ng과 동료들(2011)은 중국의 성공적 노화 문화 맥락을 조사하고, Rowe와 Kahn 모델의 ‘삶에 대한 참여’ 요소를 대신하여 돌봄 형태의 참여와 생산적 형태의 참여를 모두 포함한 모델을 권고했다.",
    "성공적 노화의 문화적 분석에 새로운 차원을 더한 Torres(1999, 2001, 2003, 2006, 2009)는 문화 사이를 이주한 노인, 즉 스웨덴으로 이주한 이란계 사람들의 성공적 노화 정의에 깔린 가치지향의 복잡성을 탐구했다. Torres(2006)는 사람들이 성공적 노화를 정의하는 방식뿐 아니라 그러한 정의에 이르는 방식과 그 정의에 내재한 이해에도 큰 다양성이 있음을 확인했다. 이 문화내적 접근은 문화 간 차이뿐 아니라 문화 내부의 차이도 보여 줌으로써 문화특수적인 성공적 노화 관념을 문제화했다. Torres의 주장에 따르면 “문화적 가치는 사람들이 무엇이 좋은 노년을 이루는지를 이해하는 방식을 이끌 수 있지만, 그렇다고 해서 그 가치가 반드시 사람들로 하여금 성공적 노화를 어느 한 가지 특정 방식으로 생각하게 만드는 것은 아니다”(p. 20). 이로써 Torres는 문화특수적이고 정적인 성공적 노화 측정의 적합성에 이의를 제기하고, 성공적 노화에 관한 노년학적 틀을 넓힐 것을 요구했다(Torres, 2001).",
    "전체적으로 ‘누락된 목소리’의 비판은 지배적인 성공적 노화 모델에 주관적 의미가 빠져 있고 그 결과 문화적 적합성이 부족하다는 점을 문제 삼았다. ‘추가하고 섞기’ 집단과 마찬가지로 이 비판 집단은 모델의 변화를 요구했지만, 성공적 노화라는 더 폭넓은 관념을 하나의 이상으로서 비교적 온전히 유지했다.",
    "1990년부터 2013년 사이에 출판된 논문 14편은 성공적 노화 패러다임의 ‘가정, 개념화, 적용’(Scheidt, Humpherys, & Yorgason, 1999, p. 277)을 비판하고, 노년학과 생의학에서 이 패러다임을 계속 사용하는 데 심각한 우려를 제기했다(Dillaway & Byrnes, 2009). 이 논문들은 성공적 노화에 대한 비판의 폭과 깊이가 두드러졌기 때문에 문헌고찰 결과의 주요 부분을 이루었다. ‘통렬한 비판’은 비판적 노년학, 비판연구, 여성주의 장애학, 서사노년학, 비판적 담론분석 등 여러 학문분야에 토대를 두었다. 구체적인 초점은 달랐지만 이 비판들은 성공적 노화의 개인주의적 접근, 내포된 연령주의와 비장애 중심주의, 신자유주의적 맥락, 사회와 노인의 삶의 경험에 미치는 부정적 영향, 사회정의에 미치는 영향 가운데 하나 이상의 핵심 우려를 공유했다. 나아가 이들은 ‘성공적’ 노화라는 관념을 더 폭넓게 거부하고 대안적 틀을 요구했다.",
    "이 문헌은 성공적 노화 패러다임이 개인에게 초점을 두는 방식이 비현실적이고 배제적이라는 우려를 반복해서 제기했다(Angus & Reeve, 2006; Holstein & Minkler, 2003; Morell, 2003; Scheidt et al., 1999; Stone, 2003). 비판자들은 특정 행동과 태도를 채택함으로써 노화, 특히 신체·인지 건강을 개인이 통제할 수 있는 것처럼 표현하는 방식이 사람들의 삶에 존재하는 사회적·경제적·문화적 맥락(Clarke & Griffin, 2008; Dillaway & Byrnes, 2009; Leibing, 2005), 곧 계급, 젠더, 인종, 능력 및 서로 교차하는 다른 사회적 위치에 따른 생애기회의 불평등(Minkler, 1990)을 무시하는 의료화된 노화관을 반영한다고 주장했다. Scheidt와 동료들(1999)은 성공적 노화 관점의 협소하고 개인주의적인 시각을 일찍이 비판하면서, 성공적 노화가 “우리가 어떻게 나이 드는지에 강력한 결정적 역할을 하는”(p. 278) 노화의 사회구조적 맥락을 고려하지 못한다고 지적했다.",
    "그동안 비판자들은 교육, 고용, 질 좋은 주거환경, 건강한 음식, 여가활동에 대한 접근과 같은 더 폭넓은 맥락이 가장 특권적인 집단에 유리하게 작용하여 그들이 성공적으로 노화할 가능성을 높이는 반면, 주변화된(덜 특권적인) 집단은 그러한 성공을 경험할 가능성이 더 낮다고 거듭 주장했다(Dillaway & Byrnes, 2009; Holstein & Minkler, 2003). 또한 성공적 노화를 하나의 최종상태로 묘사하는 것은 노화를 “새로운 역할, 관점, 상호 연관된 많은 사회적 맥락의 발달을 수반하는 폭넓은 생물사회적 과정이 아니라, 개인이 성공적 또는 통상적이라고 진단되는지에 따라 이기거나 지는 게임”(Dillaway & Byrnes, 2009, p. 706)으로 잘못 구성한다.",
    "여러 비판자는 성공적 노화 모델에 내재하지만 흔히 인식되지 않는, 서로 얽힌 연령주의와 비장애 중심주의를 지적했다(Holstein & Minkler, 2003; Minkler, 1990; Morell, 2003; Stone, 2003). 성공적 노화는 질병과 장애의 회피를 이상적이고 암묵적으로 좋은 노화로 규정하는 반면, 통상적 노화과정의 존재는 바람직하지 않거나 나쁜 노화로 간주한다. 성공적 노화 대 실패한 노화라는 이 이분법은 ‘새로운 연령주의’(Angus & Reeve, 2006, p. 143) 또는 ‘양극화된 연령주의’(Rozanova, Northcott, & McDaniel, 2006에서 Cole, 1992와 McHugh, 2003에 귀속)를 만들어 낸다고 한다. Holstein과 Minkler(2003)가 지적했듯이 “성공적 노화와 같은 규범적 용어는 중립적이지 않다. 그러한 용어에는 비교적이고 양자택일적이며 위계적으로 서열화된 차원이 실려 있다”(p. 791). 또 다른 연구자들은 질병과 장애의 회피를 성공이라고 명명함으로써 성공적 노화가 “노화하는 몸에 대한 암묵적 적대감”(Morell, 2003, p. 69), 특히 기본적으로 실패로 간주되는 장애가 있거나 질병이 있는 몸에 대한 적대감을 품는다고 설명했다. 이는 “인지·신체 능력에 가치를 부여하는 한편 모든 종류의 장애를 폄하하는”(Stone, 2003, p. 62) 강력한 이분법을 만들어 내고, 장애와 질병이 있는 노인에게 그 상태의 책임을 돌리며 사회의 도덕적 판단에 노출한다(Clarke & Griffin, 2008; Holstein & Minkler, 2003; Morell, 2003; Rozanova et al., 2006).",
    "‘통렬한 비판’ 가운데 다수는 성공적 노화의 신자유주의적 이데올로기 토대를 부각했다. 신체·인지 기능을 유지할 책임을 개인에게 집중함으로써 성공적 노화 패러다임은 노인과 장애인에게 사회적 지원과 그 밖의 지원을 제공하고, 특히 애초에 질병과 장애를 만들어 내는 사회적·구조적 불평등을 해결해야 할 국가의 책임을 제한하려는 노력을 반영하고 그에 기여한다(Dillaway & Byrnes, 2009; Minkler, 1990; Morell, 2003; Scheidt et al., 1999; Sinding & Gray, 2005). Holstein과 Minkler(2003)의 설명에 따르면, 이는 사회안전망 프로그램에 의존하는 노인 인구를 한층 더 주변화한다.",
    "> 주택 개조와 보조기기에 대한 Medicare 보장 확대, 그리고 노인·장애인 수급자를 빈곤선 위로 끌어올릴 Supplemental Social Security Income 급여 인상 정책은, 정부 지원이 더는 별로 필요하지 않은 새로운 부류의 성공적으로 노화하는 노인이라는 고정관념을 받아들인 대중과 입법부 때문에 큰 타격을 받을 수 있다. (p. 793)",
    "Dillaway와 Byrnes(2009)는 성공적(그리고 생산적) 노화 패러다임이 처음 등장한 역사적 맥락을 강조했다. 1980년대와 1990년대에 이 패러다임이 부상한 시기는 미국의 경제위기를 복지국가, 특히 Social Security와 Medicare의 탓으로 돌리려는 보수주의가 강화된 때와 일치했다. 이 모델들은 장애나 의존을 피하지 못한 책임을 노화하는 개인에게 돌리는 듯 보이기 때문에, 시의적절하게 등장한 이 모델들이 고령인구의 부담에 대한 정부의 커지는 불안을 “촉진하고 강화했을 수 있으며”(p. 708), “노화와 관련된 부정적 개념화를 심화하고 노화하는 개인으로 인한 공적 부담을 줄이기 위한 도구”(pp. 708–709)로 사용되었을 수 있다.",
    "Scheidt와 동료들(1999)은 질병과 장애를 피할 수 있는 개인의 능력에 성공적 노화 모델이 도덕적 가치를 부여하고 그 가치가 ‘공적 영역으로 이전되는 것’(p. 278)에 대해 일찍이 우려를 제기했다. 더 최근의 여러 연구는 사람들이 자신의 노화 정체성을 협상하면서 그 이상을 내면화하고 통합하며 때로 저항함에 따라 이러한 도덕적 위계가 실제로 대중에게 이전되었음을 보여 주었다. 노년에 관한 미디어의 묘사는 성공적 노화 담론을 반영하고 재생산한다. Rozanova와 동료들(2006)은 *The Globe & Mail* 신문이 노화를 묘사하는 방식에서 성공적 노화의 강력한 서사를 발견했다. 흔히 노인 면접을 통해 포착된 이 서사는 개인적 통제, 질병과 장애의 회피, 성공적으로 노화하는 사람을 실패한 사람보다 가치 있게 여기는 데 초점을 맞췄다. Rozanova(2010)의 후속 연구는 성공적 노화, 양극화된 연령주의, 개인책임과 비용 억제라는 신자유주의적 맥락을 연결했다. Rozanova는 다음과 같이 설명했다.",
    "> 신문 텍스트는 성공적으로 노화해야 할 개인의 공적 의무를 강조하고… 이상적인 노화 시민은 성공적으로 노화하기를 선택하고, 가능한 한 오래 젊음을 유지하며, 현명한 소비자이자 생산적 활동의 적극적인 참여자로서 경제에 기여하고, 의료 및 기타 공공서비스의 이용을 피하도록 건강을 유지하는 사람이라는 도덕적 메시지를 전달한다. (p. 220)",
    "Leibing(2005)은 1967년부터 2002년까지 브라질 인쇄매체를 조사하여 성공적 노화가 대중에게 제시되는 방식에 관해 이와 유사한 비판적 우려를 밝혔다. 브라질 노인들은 “긍정적 노화에 필요하다고 선전되는 자립성에 [의해] 갇혀 있으며”(p. 29), 그중 많은 사람이 빈곤 속에서 기본 욕구를 충족하기에 심각하게 부족한 사회 프로그램에 기대어 산다는 모순에 놓여 있다.",
    "성공적 노화의 가치 이전은 항노화 기술의 맥락에서도 일어났다. Flatt, Settersten, Ponsaran, Fishman(2013)은 항노화 실무자들이 밝힌 항노화 의학의 목표가 Rowe와 Kahn이 제시한 성공적 노화의 세 요소와 일치한다는 사실을 확인했다. 성공적 노화와 항노화 의학 사이의 이 우려스러운 유사성은 “노화가 무엇인지에 대한 대중의 개념과 노화과정을 관리·통제하는 정신을 형성하는 데 성공적 노화 모델이 거둔 성공을 반영한다”(p. 1). 나아가 이는 “노년을 재개념화하려는 노력이 초래한 가장 문제적인 사회적·문화적·경제적 결과 가운데 일부를 부각한다”(같은 쪽). Brooks(2010)는 항노화 기술에 대한 여성들의 태도를 조사하고 개인주의, 여성성에 대한 기대, 소비자 자본주의, 성공적 노화 사이의 연결을 확인했다. 많은 여성에게 성공적 노화는 “식이요법과 운동으로 건강하고 활동적인 몸을 유지하는 것뿐 아니라 수술과 주사 시술을 통해 젊어 보이는 몸(과 얼굴)을 유지하는 것”(p. 251)을 뜻한다. Leibing(2005)은 브라질에서도 성공적 노화, 의료화, 항노화 기술, 여성성과 미덕에 관한 대중적 관점이 이와 비슷하게 합류한다고 설명했다.",
    "질병이나 장애가 있는 노인은 자신을 성공적으로 노화하지 못한 사람으로 규정하는 규범적 이상과 특히 힘겨운 협상을 해야 한다. 유방암을 경험한 여성들은 긍정적 사고, 건강증진 행동 참여, ‘허약함과 자신을 동일시하지 말라는 금지’(Sinding & Gray, 2005, p. 159)로 정의되는 ‘씩씩한 생존자’ 서사의 부담을 느낀다고 보고했다. 연구자들은 이 서사에 성공적 노화의 규범적 가치가 배어 있음을 확인했고, 이는 ‘암 재발을 실패로 간주하는’(같은 쪽) 생존자 서사의 ‘곤란한 도덕적 토대’에 대한 우려를 낳는다. 이러한 서사는 여성들을 고립시키고 비난받게 하며 불편이나 두려움을 표현할 여지를 거의 주지 않을 수 있다. Clarke와 Griffin(2008)도 이와 비슷하게 성공적 노화 규범 때문에 여러 만성질환이 있고 “의료화된 건강의 이상과 사회적인 매력의 이상에 신체적으로 도달할 수 없는 사람은 도덕적으로 무책임하고 사회적으로 바람직하지 않은 사람이라는 낙인이 찍힐 위험에 처한다”(p. 1092)는 사실을 확인했다. 이처럼 규범적 이상은 만성질환이나 장애가 있는 사람들이 자신의 노화하는 몸을 인식하는 방식에 부정적 영향을 줄 수 있다.",
    "20년이 넘는 기간 동안 성공적 노화에 대한 비판은 사회정의와 형평성에 관련된 우려를 제기해 왔다. 비판자들은 성공적 노화가 노화정책과 노화 정체성에 미치는 영향을 통해 노인을 돕기보다 의도치 않게 더 큰 해를 끼친다고 주장한다(Dillaway & Byrnes, 2009; Holstein & Minkler, 2003; Leibing, 2005; Scheidt et al., 1999). 학자들은 노년을 이해하기 위한 더 정의롭고 현실적이며 역량강화적인 틀을 폭넓게 권고했다. 여러 연구자는 장애와 질병이 있는 사람을 포함하여 인구의 온전한 다양성을 인정하는, 이분법으로 나누지 않는 노화관을 요구했다(Minkler, 1990; Morell, 2003; Scheidt et al., 1999). 연령주의와 비장애 중심주의를 동시에 다루는 일이 이 전략의 핵심이다. Stone(2003)의 주장처럼 장애를 병리화하지 않고 “인간 경험의 일부로, 모든 사람을 상호의존적인 존재로”(p. 65) 보도록 “장애에 대한 태도가 바뀔 때까지 노인이 사회의 중요한 구성원으로 대우받는 모습을 보기 어려울 것이다”(p. 59).",
    "마찬가지로 Morell(2003)은 노년기에 존재하는 ‘힘과 취약성의 상호작용’(p. 69)을 인정하고, 장애와 죽음을 ‘수용할 수 있고 존중받을 만한 인간 경험’(p. 71)으로 포용하며, 장애·질병·죽음에 대한 낙인과 두려움을 줄이고, 노인이 자신의 욕구와 바람을 스스로 정의하도록 하는 체현된 역량강화 모델을 옹호했다. 이러한 자기결정권은 사람들이 나이 들어 가면서 번영하는 데 필수적이다(Stone, 2003). 노인의 삶의 경험을 더 온전히 반영하고, 질적 방법과 노인이 참여하는 지역사회 기반 참여연구를 통합한 경험적 증거로 뒷받침되는 새로운 패러다임이 필요하다(Dillaway & Byrnes, 2009; Holstein & Minkler, 2003).",
    "마지막으로 비판자들은 사회정의 지향적 노화 모델이 노화 경험에 대한 구조적 영향을 고려하고, 경제적 안정, 안전한 주거와 지역사회, 차별 방지, 존엄과 정체성 보호를 강화할 수 있는 정책·제도·지역사회 중심 전략을 확인해야 한다고 지적했다(Angus & Reeve, 2006; Minkler, 1990; Morell, 2003; Scheidt et al., 1999; Stone, 2003).",
    "비판적 문헌의 또 다른 하위집단(n = 7)은 성공적 노화의 기본 원칙을 거부했다. 이들은 성공적 노화라는 폭넓은 관념, 질병과 장애가 없는 노년이라는 비현실적 묘사, 그리고 그것이 내면화된 연령주의와 노인이 나이 들며 생기는 변화에 대처하지 못하는 데 기여한다는 우려를 ‘통렬한 비판’과 공유했다. 해결책으로 이 집단은 전통적인 성공적 노화 모델보다 더 전체론적이기는 하지만 대체로 개인에 초점을 맞춘 대안적 이상 모델, 곧 ‘새로운 틀과 명칭’을 제시했다. 이 새로운 모델들은 상실을 포용하고 의미와 정체성에 관한 영적 특성 및 그 밖의 특성을 통합했으며, 불교 같은 동양철학의 영향을 명시적으로 받은 경우가 많았다. 제안된 모델에는 균형 잡힌 노화(Butler, Fujii, & Sasaki, 2011), 회복탄력적 노화(Harris, 2008; Harris & Keady, 2008; Wild, Wiles, & Allen, 2013), 조화로운 노화(Liang & Luo, 2012), 그리고 그 밖의 전체론적·의미 기반·영적 모델(Jianbin, 2010; Leder, 1999)이 포함되었다.",
    "이 비판자들은 성공적 노화가 배제적이고 제한적이라고 거부하면서 모든 개인이 존엄하게 나이 들 동등한 기회를 얻는 더 보편적인 모델을 모색했다. Jianbin(2010)은 노화하는 개인이 자신의 삶을 이해하고 의미를 찾도록 돕는 자신의 통합 모델을, Rowe와 Kahn의 모델에 영성 기준을 추가하지만 그 ‘이론적 핵심을 질적으로 바로잡지’(p. 187) 못하는 수많은 확장된 성공적 노화 모델과 대조했다. Liang과 Luo(2012)는 성공적 노화 모델이 연령주의적이고 ‘몸과 마음 사이의 부조화’(p. 328)를 만들며 자본주의·소비주의 이상이 배어 있고 비서구적 가치를 반영하지 못한다고 주장했다. 이들은 성공적 노화의 대안으로 노화의 도전과 기회를 인정하고 ‘인간의 상호의존적 본성을 강조하는’(p. 327) 조화로운 노화 모델을 제시했다.",
    "Harris(2008)는 회복탄력성이 모든 노인에게 도달 가능하다고 보았기 때문에 배제적인 성공적 노화 모델을 더 포괄적인 회복탄력적 노화 모델로 대체해야 한다고 주장했다. Wild와 동료들(2013)은 개인적 회복탄력성과 사회적 회복탄력성의 상호의존, 노인에게서 도출한 회복탄력성의 의미, 사회구조와 권력불평등의 영향, 전통적인 회복탄력성 모델의 시야에 흔히 포착되지 않는 주변화된 지역사회의 수많은 ‘숨겨진 회복탄력성 자원’, 그리고 사람들의 현재 상황에 책임을 돌리기 위해 회복탄력성 모델이 노인에게 불리하게 사용될 수 있는 방식에 대한 비판적 인식 등 여러 요소를 통합한 더 포괄적인 회복탄력성 개념화를 제시했다. Wild와 동료들의 모델은 개인을 훨씬 넘어 회복탄력적 노화의 생태학적 개념화를 포착했다.",
    "전체적으로 ‘새로운 틀과 명칭’은 성공적 노화 모델을 거부하고, 노화에 대해 더 전체론적이고 통합적이며 포괄적이고 전 세계적으로 적합한 이해를 반영한다고 주장하는 대안을 제시했다.",
    "성공적 노화 모델은 사회노년학에서 지배적인 구성개념이다. 이 체계적 문헌고찰은 지난 20년 동안 성공적 노화에 관해 제기된 우려를 사회노년학 문헌에서 검토했다. 그 결과 많은 이가 제한적이고 불명확하게 정의되었다고 동의한 성공적 노화의 틀에 대응하는 네 가지 일반적 처방이 확인되었다. ‘추가하고 섞기’ 집단은 성공적 노화 개념화를 다차원적으로 확장할 것을 제안하고 모델을 완성하기 위해 방대한 요소를 추가했다. ‘누락된 목소리’ 집단은 노년학 전문가들이 개발한 (서로 현저히 다른) 객관적 측정치에 노인들이 부여하는 성공적 노화의 주관적 의미를 더해야 한다고 주장했다. ‘통렬한 비판’은 성공적 노화의 근본적·이데올로기적 문제를 드러내고, 노화의 온전한 다양성을 포용하고 낙인과 차별을 피하며 노화의 사회적·정치적·경제적 맥락을 개선하도록 개입하는 더 정의롭고 포괄적인 틀을 요구했다. ‘새로운 틀과 명칭’은 기존 모델의 토대에 도전하는 대안적 노화 이상을 제안했지만, 흔히 개인적 이상에 대한 초점을 유지했다. 전체적으로 이 집단들은 서로 겹치는 비판을 제시했지만, 사회노년학이 성공적 노화를 어떻게 다루어야 하는지에 관해 네 가지 서로 다른 권고를 제시했다. 확장하기, 개인화하기, 폐기하기, 또는 틀과 명칭을 새로 만들기다.",
    "사회노년학자들은 일반적으로 연령통합적 사회를 촉진하고, 사회구조적 조건이 노화과정에 미치는 영향을 인식하며, 노화의 다양성을 인정하려고 노력한다(Hooyman & Kiyak, 2011; Riley & Riley, 1994). 이 분야가 사회적인 것에 기우는 성향을 고려하면, 사회노년학자들이 처음에는 환원주의적이고 생리적인 노화 이해에 토대를 둔 이 성공적 노화 개념에 계속 도전하고 이를 확장하려 한 것은 놀라운 일이 아니다. 이것이 Matilda Riley가 1998년에 이 개념에 이의를 제기한 이유이며, 이 고찰에서 보였듯 그 뒤 수많은 연구자가 같은 일을 한 이유다. 이 비판 대부분은 장애와 질병의 회피, 인지·신체 기능의 유지, 삶에 대한 참여를 성공적 노화라고 정의하면 노화의 온전한 경험과 맥락을 포착하지 못한다는 전제에서 출발한다. 성공적 노화 연구자들이 성공적 노화의 과정을 확인하는 쪽으로 전환한 것은 새로운 관점을 뜻했지만, 그들은 여전히 같은 이상에 토대를 두었다. 어떤 이들은 사회노년학이 ‘추가하고 섞기’와 ‘누락된 목소리’ 접근의 개선책을 통해 성공적 노화의 결점을 다루는 역할을 이미 수행했다고 말할 수 있다. 성공적 노화의 기준을 확장하면 더 크고 다양한 집단이 성공의 범위 안에 들어온다. 그러나 여전히 “성공에 필요한 사회구조적 기회를 충분히 발전시키지 못하는”(Riley, 1998, p. 151) 생리적 모델에 기초한, 갈수록 모호해지는 이 개념에 방대한 첨가물이 붙는 모습을 검토하면서, 우리는 이 개념적 혼란이 노년학자들이 목표를 달성하는 데 어떻게 도움이 되는지 의문을 품지 않을 수 없었다.",
    "성공적 노화 비판의 네 범주 모두에는 다양한 성공적 노화 기준을 충족하는 노인의 비율이 작다는 분명한 우려가 있었다. 많은 저자는 이 개념이 성공한 노화 대 실패한 노화라는 이분법을 구성한다고 비판했다. 이 이분법은 과거의 쇠퇴·상실 모델 대 오늘날 인기 있는 긍정적 노화 패러다임이라는 이분법과 포개진다. 이 두 이분법은 가치판단이라는 같은 동전의 양면이라고 볼 수 있다. 네 범주의 비판자들은 모두 성공적 노화가 암시하는 개인적 성취 관념이 세계 각지의 많은 사람들, 미국 안에서도 다양한 문화적 맥락을 지닌 사람들이 공유하는 삶과 노화에 대한 문화적 이해와 양립할 수 없다는 문화적 편향도 지적했다. 자료에서 성공적 노화의 기준과 의미가 대부분의 사람을 배제하고 갈수록 불명확해지는 것으로 나타날 때, 사회노년학자들은 다음 질문에 직면한다. 실패를 줄이기 위해 성공적 노화의 기준을 계속 완화하고 개념에 새로운 차원을 추가함으로써 개념적 명료성을 더 낮춰야 하는가(일종의 정제된 혼란인가)? 아니면 사회노년학자들이 이해하고 다루려는 노화의 개인적 맥락뿐 아니라 사회적·정치적·경제적 맥락까지 더 잘 포착하는, 더 현실적이고 유용한 개념을 개발하는 방향으로 나아가야 하는가?",
    "이 분야의 많은 연구자는 노화를 협소하고 포착하기 어렵게 개념화하기 때문에 이 모델이 불충분하다고 주장했지만, 다른 연구자들은 한 걸음 더 나아가 이 모델이 위험하고, 사람들을 더 주변화하며, 사람들의 자기정체성에 부정적 영향을 줄 수 있다고 말한다. 성공적 노화 패러다임에 20년을 투자했고 그 패러다임에 대한 우려를 20년 동안 표현해 온 사회노년학자들은 윤리적 딜레마에 직면해 있다. 사회노년학자 Gunhild Hagestad는 2013년 미국노년학회 연례 학술대회에서 수십 년에 걸친 자신의 경력을 솔직하게 돌아보며 “우리는 우리가 동의하지 않는 노화관을 생산한다”고 말했다.",
    "성공적 노화의 한계에 관한 이 모든 우려에도 우리는 왜 이 구성개념을 붙들고 있는가?",
    "분명 이 개념은 사람들이 나이 들어 가면서 (협소하게 정의된) 좋은 건강을 경험할 가능성을 높이기 위해 무엇을 할 수 있는지를 이해하는 데 도움이 되었다. 하지만 누구에게 어떤 대가를 치르게 하는가? 더 폭넓은 사회구조적 조건을 고려하지 않고, 방대한 정의가 존재하며, 미국과 전 세계 노인의 대다수를 배제하는 규범적 이상이 사람들이 나이 들어 가는 과정을 지원하고 역량을 강화하는 데 어떻게 도움이 되는가? 성공적 노화 연구에 대한 공공·민간 자금지원이 방대한 성공적 노화 연구 및 프로그램 기반을 지탱해 온 것은 분명하다. 동시에 모든 분야의 연구자는 “패러다임은 자금과 긴밀히 얽혀 있으며, 우리가 양심상 감당할 수 있는 수준 이상으로 우리를 옭아맨다”는 Hagestad(2013)의 솔직한 주장에 동의할 가능성이 크다. 성공적 노화 같은 패러다임 주변에 성장한 기반을 고려하면 그 결점에 직면해 이 패러다임에서 벗어나는 일은 인정하건대 어렵다.",
    "그럼에도 이 모델이 무엇을 의미하고 실제로 누구에게 해당하는지를 둘러싼 개념적 혼란에도 왜 그토록 두드러진 지위를 얻었는지 비판적으로 묻는 일은 필수적이다. Tornstam(1992)은 ‘노년학은 어디로 가는가’에서 결점이 갈수록 명백해지는데도 우리가 노년학 모델에 계속 얽매이는 이유를 탐구했다. 그는 사회에서 지배적인 노년에 관한 가치와 가정이 노년학의 사상과 이론에 내재하여 흔히 시야를 가리는 영향력을 발휘한다고 설명했다. 예를 들어 규범적 노화 이상(성공적 노화, 생산적 노화, 활동적 노화 등)에서 생산성과 독립성을 강조하는 것은 중년 백인 중산층 남성의 지배적인 가치지향에 깊이 뿌리내렸다고 Tornstam은 지적했다. 이러한 ‘사회에서 노년학으로 전이된 전제의 범람’은 제한된 사회적 틀 밖을 보기 어렵게 만들고 “자료가 이론과 모순될 때조차 우리가 이론에 매달리게 할 수 있다”(p. 322). 자료가 “이 관념의 터무니없음과 그것이 나타내는 서구 가치의 강요”(Torres, 2006, p. 2)를 보여 주는데도 성공적 노화 관념을 계속 다듬고 강화하려는 오늘날의 시도에서 이를 볼 수 있다.",
    "이 노년학 모델들은 이데올로기의 영향 때문에도 제자리에 고착된 듯하다. ‘통렬한 비판’ 가운데 여러 논문은 성공적 노화가 개인의 행동 개입에 초점을 맞추는 것과 고령인구의 비용에 대한 신자유주의적 이데올로기의 우려 사이에 존재하는 문제적인 합치를 지적했다. 성공적 노화 패러다임의 사용은 사람들이 나이 들며 살아가는 삶을 향상하는 환경을 조성하는 데서, 성공적으로 노화할 가능성을 높이려면 어떤 개인 행동을 해야 하는지 사람들에게 교육하는 것으로 관심이 이동한 과정과 나란히 진행되었고 여러 면에서 이를 뒷받침했다. Katz(2013)는 개인의 생활양식에 대한 노년학의 초점이 갖는 더 폭넓은 함의를 경고하며 다음과 같이 지적했다. “표면적으로 성공적 노화 패러다임의 인기는 그 패러다임이 개인 중심적 설명을 제공하기 때문이지만, 더 깊은 차원에서 그러한 인기는 이 패러다임이 ‘더 많은 사회적 지원과 자원을 요구하는 정치적 로비를 무력화하기’ 때문에 생긴다(Dillaway & Byrnes, 2009, p. 708)”(17번째 문단). 사회노년학의 이처럼 두드러진 모델이 정책과 실천에서 이러한 기능을 수행하는 동시에, 성공에 관한 사회적 기준을 충족해야 한다는 압박을 느끼는 노화하는 사람들의 자기정체성을 훼손한다면 이제 이 모델에 대한 우리의 헌신을 재고해야 한다.",
    "우리의 헌신을 재고하는 것이 한 단계다. 새로운 모델과 패러다임으로 나아가는 것이 또 다른 단계다. 이는 지금 우리 앞에 놓인 핵심 과제라고 볼 수 있다. Tornstam(1992)은 노인들이 자신의 욕구, 가치, 의미, 심지어 연구질문까지 직접 정의하게 함으로써 이들을 옭아매는 패러다임의 ‘경계를 터뜨리라’(p. 323)고 노년학자들에게 촉구했다. 그는 기존 패러다임을 뒤집어 새로운 패러다임을 탐색할 것도 제안했다. 여기서 검토한 성공적 노화 비판에서 나온 여러 제안과 일관되게, 이는 생산성, 독립성, 장애의 회피, 개인책임에서 관심을 옮겨 예컨대 비생산성, 상호의존성, 장애, 사회적 책임에 가치를 두는 일을 포함한다. 처음에는 급진적인 생각처럼 보일 수 있지만 여기서 제기된 비판을 다루는 설득력 있는 새로운 발상으로 이어질 수 있다.",
    "나아가 노인이 되는 이상적인 방식은 하나뿐이지 않으므로 이상 모델을 구성하려는 시도는 실패할 수밖에 없음을 인정해야 한다. 이상 모델은 노인이 추구하기에 적절하다고 합의된 기준 묶음이 하나 존재한다고 전제한다. 지난 25년 동안 성공적 노화에 제기된 비판에 대한 이 검토는 개인 노화의 이상적 모델을 확인하는 일이 불가능할 뿐 아니라 파괴적이기도 하다는 점을 시사한다. 그러한 이상은 그 모델이 구성한 경계 밖에 필연적으로 놓이는 방대한 다양성의 가치를 떨어뜨린다. 이제 성공적 노화와 그것이 속한 더 폭넓은 이상 모델 패러다임에서 벗어나, 사람들이 나이 들어 가면서 자기 방식대로 번영할 수 있는 조건을 조성하는 데 연구의 초점을 맞춰야 한다.",
    "본 고찰을 ASG 밖으로 확장하지 않았기 때문에 누락된 목소리가 있다. 가장 비판적인 기여 가운데 일부는 ASG에 나타나지 않고, 단행본이나 이 분야 밖의 의료사회학 또는 인류학 학술지에 출판되었을 수 있다(예: Belgrave & Sayed, 2013). 또한 본 고찰은 영어로 출판된 논문으로 한정되었기 때문에 다른 언어의 중요한 비판, 특히 미국 같은 국가에서 일시적으로 지배적인 문화보다 삶(따라서 노년기)에 대해 덜 개인주의적인 관점을 가진 국가에서 사용하는 언어로 된 비판을 놓쳤을 가능성이 있다.",
    "성공적 노화에 관한 사회노년학의 비판적 문헌을 검토한 결과, 규범적 개념을 다양한 노인 인구에 적용하려는 광범위하고 오래된 고투가 드러났다. 여러 노년학자는 노년기 건강불평등과 사회불평등을 포착하도록 Rowe와 Kahn의 원래 모델을 진지하게 재구성하려 했지만, 이들이 집합적으로 제시한 방대한 추가 기준은 규범적 모델이 정의상 배제적이라는 근본 문제의 징후다. 아마 가장 우려스러운 문제는 성공적 노화 모델이 연령주의를 해체하기보다 오히려 연령주의에 기여함으로써 사회노년학자들의 의도에 반하여 작동한다는 증거일 것이다. 25년에 걸친 비판과 모델의 여러 변칙을 바로잡으려는 반복된 시도 뒤에는 성공적 노화라는 용어를 거부하고(Dillaway & Byrnes, 2009), “우리의 ‘전통적’ 이론을 이루는 성역에 감히 의문을 제기할”(Tornstam, 1992, p. 322) 때가 되었다. Cole(1995)의 말을 되풀이하면 “지적으로 풍부한 사회노년학의 성장은 경험연구, 해석, 비판적 평가, 성찰적 지식 사이의 더 큰 상호작용을 계속 촉진하려는 의지에 달려 있다”(p. S343). 이러한 상호작용이 없다면 성공적 노화에 대한 비판적 담론이 성공적 노화 연구 및 프로그램과 나란히 달리는 평행우주를 유지할 위험이 있다. 이 담론들을 하나의 대담하고 성찰적인 대화로 모으자.",
]


SEGMENT_BLOCK_RANGES = {
    "META-001": (0, 6),
    "ABS-001": (6, 10),
    "KEY-001": (10, 11),
    "INTRO-001": (11, 14),
    "METHODS-001": (14, 17),
    "ADD-STIR-001": (17, 18),
    "PREVALENCE-001": (18, 20),
    "CRITERIA-001": (20, 22),
    "MISSING-VOICES-001": (22, 23),
    "COMPARE-001": (23, 26),
    "CULTURE-001": (26, 30),
    "HARD-HITTING-001": (30, 31),
    "INDIVIDUALISM-001": (31, 33),
    "AGEISM-001": (33, 34),
    "NEOLIBERAL-001": (34, 37),
    "INFLUENCES-001": (37, 42),
    "SOCIAL-JUSTICE-001": (42, 45),
    "NEW-FRAMES-001": (45, 49),
    "DISCUSSION-001": (49, 54),
    "DISCUSSION-002": (54, 59),
    "LIMITATIONS-001": (59, 60),
    "CONCLUSION-001": (60, 61),
}


SECTION_TRANSLATIONS = {
    "Article metadata": "논문 메타데이터",
    "Abstract": "초록",
    "Key Words": "핵심어",
    "Introduction": "서론",
    "Methods": "방법",
    "Theme 1: Add and Stir": "주제 1: 추가하고 섞기",
    "A Prevalence Problem": "유병률의 문제",
    "Additional Criteria": "추가 기준",
    "Theme 2: The Missing Voices": "주제 2: 누락된 목소리",
    "Compare and Contrast": "비교와 대조",
    "Cultural Relevance and Variability": "문화적 적합성과 다양성",
    "Theme 3: Hard Hitting Critiques": "주제 3: 통렬한 비판",
    "Individualism": "개인주의",
    "Ageism and Ableism": "연령주의와 비장애 중심주의",
    "Neoliberal and Conservative Contexts": "신자유주의적·보수주의적 맥락",
    "Influences, Applications, and Internalizations": "영향, 적용, 내면화",
    "Alternative Approaches for Social Justice": "사회정의를 위한 대안적 접근",
    "Theme 4: New Frames and Names": "주제 4: 새로운 틀과 명칭",
    "Discussion: four prescriptions and ethical dilemma": "논의: 네 가지 처방과 윤리적 딜레마",
    "Discussion: paradigms, funding, and alternatives": "논의: 패러다임, 자금지원, 대안",
    "Limitations": "한계",
    "Conclusion": "결론",
    "References A–Cole": "참고문헌 A–Cole",
    "References Coleman–Hilton": "참고문헌 Coleman–Hilton",
    "References Holstein–Leibing": "참고문헌 Holstein–Leibing",
    "References Lewis–Pruchno": "참고문헌 Lewis–Pruchno",
    "References Pruchno–Sinding": "참고문헌 Pruchno–Sinding",
    "References Soondool–Young": "참고문헌 Soondool–Young",
}


def digit_tokens(value: str) -> Counter[str]:
    return Counter(token.replace(",", "") for token in re.findall(r"\d+(?:[.,]\d+)?%?", value))


def split_source_blocks(source: str) -> tuple[list[str], list[str], list[str]]:
    output_blocks: list[str] = []
    source_nonreference_blocks: list[str] = []
    references: list[str] = []
    translation_index = 0
    in_references = False
    seen_headings: list[str] = []

    for block in re.split(r"\n{2,}", source.strip()):
        if re.match(r"^#{1,6}\s+", block):
            if block not in HEADING_TRANSLATIONS:
                raise ValueError(f"Missing heading translation: {block}")
            seen_headings.append(block)
            output_blocks.append(HEADING_TRANSLATIONS[block])
            if block == "## References":
                in_references = True
            continue
        if in_references:
            references.append(block)
            output_blocks.append(block)
            continue
        if translation_index >= len(TRANSLATED_BLOCKS):
            raise ValueError(f"Missing translation for source block {translation_index + 1}")
        source_nonreference_blocks.append(block)
        output_blocks.append(TRANSLATED_BLOCKS[translation_index].strip())
        translation_index += 1

    if translation_index != 61 or translation_index != len(TRANSLATED_BLOCKS):
        raise ValueError(
            f"Expected exactly 61 translated non-reference blocks, consumed {translation_index}, "
            f"prepared {len(TRANSLATED_BLOCKS)}"
        )
    if len(seen_headings) != len(HEADING_TRANSLATIONS):
        raise ValueError(
            f"Expected {len(HEADING_TRANSLATIONS)} headings, found {len(seen_headings)}"
        )
    if len(references) != 74:
        raise ValueError(f"Expected 74 references, found {len(references)}")
    return output_blocks, source_nonreference_blocks, references


def check_fidelity(source_blocks: list[str]) -> None:
    errors: list[str] = []
    for index, (source, translated) in enumerate(zip(source_blocks, TRANSLATED_BLOCKS), start=1):
        missing = digit_tokens(source) - digit_tokens(translated)
        if missing:
            rendered = ", ".join(
                f"{token}×{count}" if count > 1 else token
                for token, count in sorted(missing.items())
            )
            errors.append(f"block {index}: {rendered}")
    if errors:
        raise ValueError("Source numeric token(s) missing from translation: " + "; ".join(errors))

    required = (
        "제목이나 본문 전체에 successful aging/ageing 포함(n = 453)",
        "논문 67편",
        "논문 15편의 하위집합",
        "67편 중 16편",
        "16%–24%",
        "11.9%를 넘지 않았다",
        "3.3%–33.5%",
        "거의 절반인 30편",
        "50.3% 대 18.8%",
        "63%",
        "30%",
        "92%",
        "논문 14편",
        "하위집단(n = 7)",
        "확장하기, 개인화하기, 폐기하기, 또는 틀과 명칭을 새로 만들기",
        "지난 25년",
        "하나의 대담하고 성찰적인 대화",
    )
    joined = "\n".join(TRANSLATED_BLOCKS)
    for sentinel in required:
        if sentinel not in joined:
            raise ValueError(f"Required translation sentinel missing: {sentinel}")

    forbidden = re.compile(
        r"(?:chatbot|chatgpt|\bstt\b|lecture\s+audio|강의\s*녹음|수강생\s*정보|학생\s*정보|"
        r"(?:^|[\s`(])(?:[A-Za-z]:[\\/]|/Users/|/home/))",
        flags=re.IGNORECASE | re.MULTILINE,
    )
    if forbidden.search(joined):
        raise ValueError("Private/chatbot/STT marker found in translation")


def build_translation(source: str) -> tuple[str, list[str]]:
    output_blocks, source_blocks, references = split_source_blocks(source)
    check_fidelity(source_blocks)
    translation = "\n\n".join(output_blocks).rstrip() + "\n"
    source_refs = source.split("## References\n\n", 1)[1]
    translated_refs = translation.split("## 참고문헌\n\n", 1)[1]
    if source_refs != translated_refs:
        raise ValueError("Reference section changed during translation reconstruction")
    return translation, references


def build_translation_segments(references: list[str]) -> dict:
    source_payload = json.loads(SOURCE_SEGMENTS_PATH.read_text(encoding="utf-8"))
    translations: list[dict] = []
    reference_cursor = 0
    for source_segment in source_payload["segments"]:
        segment_id = source_segment["segment_id"]
        if segment_id in SEGMENT_BLOCK_RANGES:
            start, end = SEGMENT_BLOCK_RANGES[segment_id]
            ko_translation = "\n\n".join(
                block.removeprefix("> ") if block.startswith("> ") else block
                for block in TRANSLATED_BLOCKS[start:end]
            )
        elif segment_id.startswith("REF-"):
            source_reference_count = len(
                re.split(r"\n{2,}", source_segment["original_text"].strip())
            )
            selected = references[reference_cursor : reference_cursor + source_reference_count]
            if len(selected) != source_reference_count:
                raise ValueError(f"{segment_id}: reference slice is incomplete")
            ko_translation = "\n\n".join(selected)
            reference_cursor += source_reference_count
        else:
            raise ValueError(f"No translation segment mapping for {segment_id}")
        translations.append(
            {
                "segment_id": segment_id,
                "section": SECTION_TRANSLATIONS[source_segment["section"]],
                "source_location": source_segment["source_location"],
                "ko_translation": ko_translation,
                "is_summary": False,
            }
        )

    if reference_cursor != 74:
        raise ValueError(f"Expected 74 translated references, consumed {reference_cursor}")
    source_ids = [item["segment_id"] for item in source_payload["segments"]]
    translation_ids = [item["segment_id"] for item in translations]
    if source_ids != translation_ids or len(translations) != 28:
        raise ValueError("Translation segment IDs/order differ from the 28 source segments")
    return {
        "paper_id": SLUG,
        "title_ko": HEADING_TRANSLATIONS[
            "# Successful Aging and Its Discontents: A Systematic Review of the Social Gerontology Literature"
        ].removeprefix("# "),
        "translations": translations,
    }


def main() -> None:
    source_bytes = SOURCE_PATH.read_bytes()
    newline = "\r\n" if b"\r\n" in source_bytes else "\n"
    source = source_bytes.decode("utf-8").replace("\r\n", "\n")
    translation, references = build_translation(source)
    output_bytes = translation.replace("\n", newline).encode("utf-8")
    TRANSLATION_PATH.write_bytes(output_bytes)

    source_marker = f"## References{newline}{newline}".encode("utf-8")
    translation_marker = f"## 참고문헌{newline}{newline}".encode("utf-8")
    source_reference_bytes = source_bytes.split(source_marker, 1)[1]
    translation_reference_bytes = output_bytes.split(translation_marker, 1)[1]
    if source_reference_bytes != translation_reference_bytes:
        raise ValueError("Reference section is not byte-identical after writing translation.md")

    segment_payload = build_translation_segments(references)
    TRANSLATION_SEGMENTS_PATH.write_text(
        json.dumps(segment_payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        f"[written] {TRANSLATION_PATH.relative_to(ROOT_DIR)}: "
        f"{len(TRANSLATED_BLOCKS)} translated blocks, 74 verbatim references; "
        f"{TRANSLATION_SEGMENTS_PATH.relative_to(ROOT_DIR)}: "
        f"{len(segment_payload['translations'])} translations"
    )


if __name__ == "__main__":
    main()
