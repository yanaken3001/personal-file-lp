"""
ReadinessScore計算ロジック

ユーザーの転職準備度を0-100のスコアで算出します。
スコアが90点を超えたらPhase 3(教育)からPhase 4(誘導)へ移行します。
"""

class ReadinessCalculator:
    def __init__(self):
        # 就職時期の優先度マッピング
        self.timing_scores = {
            "1. できるだけ早く": 20,
            "2. 1～3か月": 20,
            "3. 3～6ヶ月": 10,
            "4. 相談したい": 5,
            "5. 6ヶ月以上": 0,
            "6. 適職のみ知りたい": -10
        }
        
    def calculate(self, user_data):
        """
        ReadinessScoreを計算
        
        Args:
            user_data (dict): ユーザー情報
                - employment_status: 就業状況 ("在職中" or "離職中")
                - job_timing: 就職時期
                - current_dissatisfaction_flag: 現状否定フラグ
                - future_anxiety_flag: 未来絶望フラグ
                - skill_desire_flag: 武器渇望フラグ
                - conversation_count: 対話回数
                
        Returns:
            dict: スコア情報
                - total_score: 総合スコア (0-100)
                - breakdown: スコア内訳
                - phase_recommendation: 推奨Phase
        """
        score = 0
        breakdown = {}
        
        # 1. 就職時期によるスコア加算
        timing = user_data.get("job_timing", "")
        timing_score = self.timing_scores.get(timing, 0)
        score += timing_score
        breakdown["就職時期"] = timing_score
        
        # 2. 就業状況によるスコア加算
        if user_data.get("employment_status") == "離職中":
            employment_score = 15
            score += employment_score
            breakdown["就業状況"] = employment_score
        else:
            breakdown["就業状況"] = 0
            
        # 3. フラグによるスコア加算
        flag_score = 0
        if user_data.get("current_dissatisfaction_flag"):
            flag_score += 20
        if user_data.get("future_anxiety_flag"):
            flag_score += 20
        if user_data.get("skill_desire_flag"):
            flag_score += 15
        score += flag_score
        breakdown["心理フラグ"] = flag_score
        
        # 4. 対話回数によるスコア加算(ラポール形成度)
        conversation_count = user_data.get("conversation_count", 0)
        rapport_score = min(conversation_count * 5, 25)  # 最大25点
        score += rapport_score
        breakdown["ラポール形成"] = rapport_score
        
        # スコアを0-100に正規化
        total_score = min(max(score, 0), 100)
        
        # Phase推奨
        if total_score < 30:
            phase = "Phase 1: 鏡と影"
        elif total_score < 60:
            phase = "Phase 2: 戦略的雑談"
        elif total_score < 90:
            phase = "Phase 3: 市場教育"
        else:
            phase = "Phase 4: 出口戦略"
            
        return {
            "total_score": total_score,
            "breakdown": breakdown,
            "phase_recommendation": phase
        }
    
    def get_flag_analysis(self, user_data):
        """
        フラグ状態の分析結果を返す
        
        Returns:
            dict: フラグ分析
        """
        flags = []
        if user_data.get("current_dissatisfaction_flag"):
            flags.append("現状否定フラグ: 現在の環境に不満を感じている")
        if user_data.get("future_anxiety_flag"):
            flags.append("未来絶望フラグ: 将来への不安を抱えている")
        if user_data.get("skill_desire_flag"):
            flags.append("武器渇望フラグ: スキル習得への意欲がある")
            
        return {
            "active_flags": flags,
            "flag_count": len(flags),
            "urgency_level": "高" if len(flags) >= 2 else "中" if len(flags) == 1 else "低"
        }
