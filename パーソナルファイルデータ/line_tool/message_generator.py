"""
LINE返信案生成ロジック

診断結果とユーザー属性に基づいて、最適なLINE返信案を生成します。
"""

import json
import os
from readiness_calculator import ReadinessCalculator

class MessageGenerator:
    def __init__(self, data_dir="data"):
        self.data_dir = data_dir
        self.personality_data = self._load_json("personality_data.json")
        self.templates = self._load_json("message_templates.json")
        try:
            self.manual_data = self._load_json("manual_data.json")
        except:
            print("Warning: manual_data.json not found")
            self.manual_data = {}
        self.calculator = ReadinessCalculator()
        
    def _load_json(self, filename):
        """JSONファイルを読み込む"""
        filepath = os.path.join(self.data_dir, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def _get_personality_info(self, personality_type, behavior_type):
        """
        性格類型と行動類型から詳細情報を取得
        
        Args:
            personality_type: 性格類型 (例: "AI", "PP", "DD")
            behavior_type: 行動類型 (例: "達成型", "平和型")
            
        Returns:
            dict: タイプ情報
        """
        # 性格類型のキーを探す
        type_key = None
        for key in self.personality_data.keys():
            if personality_type in key:
                type_key = key
                break
        
        if not type_key:
            return {}
            
        data = self.personality_data[type_key]
        
        # 行動類型に対応するカラム名を動的に検索
        column_name = None
        if data and len(data) > 0:
            first_row = data[0]
            for col in first_row.keys():
                # "達成型"などで始まるカラムを探す (空白除去して比較)
                if str(col).replace(" ", "").replace("　", "").startswith(behavior_type):
                    column_name = col
                    break
        
        if not column_name:
             # フォールバック
             column_name = f"{behavior_type}ディリジェンサー" if "ディリジェンサー" in type_key else f"{behavior_type}{personality_type}"
        
        # データから情報を抽出
        info = {}
        for row in data:
            row_type = row.get("Unnamed: 0", "")
            if row_type == "類型の要約":
                info["summary"] = row.get(column_name, "")
            elif row_type == "説明":
                info["description"] = row.get(column_name, "")
            elif row_type == "強み":
                info["strengths"] = row.get(column_name, "")
            elif row_type == "弱み":
                info["weaknesses"] = row.get(column_name, "")
            elif row_type == "未経験可の適職":
                info["suitable_jobs"] = row.get(column_name, "")
            elif "相性の良い社風" in row_type and "説明" in row_type:
                info["suitable_environment"] = row.get(column_name, "")
                
        return info
    
    def _extract_shadow_trait(self, personality_info):
        """
        「影の性質」を抽出
        弱みや説明から、職場で損をしている部分を抽出
        """
        weaknesses = personality_info.get("weaknesses", "")
        description = personality_info.get("description", "")
        
        # 弱みから最初の文を抽出(簡易版)
        if weaknesses:
            sentences = weaknesses.split("。")
            if sentences:
                return sentences[0] + "。"
        
    def _clean_trait(self, text, mode="full"):
        """
        テキストを整形する
        
        Args:
            text (str): 元テキスト
            mode (str): "heading" (見出し抽出) or "full" (最初の文抽出)
        """
        if not text:
            return ""
        
        # 見出しモード (強み・弱み用)
        if mode == "heading":
            # "見出し: 説明" の形式なら見出しを返す
            if ":" in text or "：" in text:
                separator = ":" if ":" in text else "："
                parts = text.split(separator)
                heading = parts[0].strip()
                # 見出しが適切かチェック (極端に長い場合は本文とみなす)
                if len(heading) < 30: 
                    return heading
            
            # コロンがない場合、最初の文を採用し、句点を取る
            first_sentence = text.split("。")[0].strip()
            # 改行がある場合は最初の行だけ
            first_sentence = first_sentence.split("\n")[0].strip()
            return first_sentence

        # 全文モード (環境用)
        # 最初の文だけを抽出
        if "。" in text:
            clean_text = text.split("。")[0].strip() + "。"
            return clean_text
            
        return text

    def _clean_duplicates(self, text):
        """重複したテキストを除去する(簡易版)"""
        if not text:
            return ""
        # 半分で分割して、前半と後半がほぼ同じなら前半を返す
        mid = len(text) // 2
        first_half = text[:mid]
        second_half = text[mid:]
        
        # 完全に一致するか、改行などの些細な違いだけか
        # 簡易的に、前半の90%が後半に含まれていたら重複とみなす
        if len(text) > 50 and first_half.strip() in second_half:
            return first_half.strip()
        
        # 重複パターン: "ABC\n\nABC"
        if text[:mid].strip() == text[mid:].strip():
             return text[:mid].strip()
             
        return text

    def _get_manual_advice(self, type_code, behavior_type):
        """マニュアルからアドバイスを取得"""
        if not self.manual_data or type_code not in self.manual_data:
            return ""
            
        type_data = self.manual_data[type_code]
        
        # 行動類型ごとの詳細があればそれを優先
        specific_advice = type_data.get("types", {}).get(behavior_type, "")
        if specific_advice:
            return self._clean_duplicates(specific_advice)
            
        # なければ全体の概要
        return self._clean_duplicates(type_data.get("overview", ""))

    def generate_message(self, user_input, phase="phase1_initial"):
        """
        LINE返信案を生成
        
        Args:
            user_input (dict): ユーザー入力情報
                - name: 名前(苗字)
                - personality_type: 性格類型
                - behavior_type: 行動類型
                - employment_status: 就業状況
                - job_timing: 就職時期
                - location: 希望勤務地
                - education: 最終学歴
                - current_dissatisfaction_flag: 現状否定フラグ
                - future_anxiety_flag: 未来絶望フラグ
                - skill_desire_flag: 武器渇望フラグ
                - conversation_count: 対話回数
                
            phase (str): メッセージPhase
            
        Returns:
            dict: 生成結果
                - message: LINE返信案
                - readiness_score: ReadinessScore情報
                - strategic_advice: 戦略的アドバイス
        """
        # 性格情報を取得
        personality_info = self._get_personality_info(
            user_input["personality_type"],
            user_input["behavior_type"]
        )
        
        # ReadinessScoreを計算
        readiness = self.calculator.calculate(user_input)
        flag_analysis = self.calculator.get_flag_analysis(user_input)
        
        # テンプレートを取得
        template_data = self.templates.get(phase, {})
        template = template_data.get("template", "")
        
        # 影の性質を抽出
        shadow_trait = self._extract_shadow_trait(personality_info)
        
        # テキスト整形
        strength = self._clean_trait(personality_info.get("strengths", "高い専門性"), mode="heading")
        weakness = self._clean_trait(personality_info.get("weaknesses", ""), mode="heading")
        suitable_environment = self._clean_trait(personality_info.get("suitable_environment", ""), mode="full")
        
        # 共通の悩み (弱みをベースに作成)
        raw_weakness = personality_info.get("weaknesses", "")
        if raw_weakness:
             # 弱みの最初の文や見出しを使って悩みを作成
             common_struggle_text = self._clean_trait(raw_weakness, mode="heading")
             # 文末調整
             if not common_struggle_text.endswith("こと"):
                 common_struggle = f"{common_struggle_text}で悩んでしまうこと"
             else:
                 common_struggle = f"{common_struggle_text}があって辛い"
        else:
             common_struggle = "周りに気を使いすぎて疲れてしまうこと"

        # 適職を簡潔に
        suitable_jobs = personality_info.get("suitable_jobs", "")
        if suitable_jobs:
            jobs_list = suitable_jobs.split("、")[:3]  # 最初の3つ
            suitable_jobs_short = "、".join(jobs_list)
        else:
            suitable_jobs_short = "ITエンジニア、事務職"
            
        # マニュアルからの情報を取得
        manual_advice = self._get_manual_advice(
            user_input.get("personality_type"), 
            user_input.get("behavior_type")
        )
        
        # テンプレートに値を埋め込む
        format_args = {
            "name": user_input.get("name", ""),
            "personality_type": f"{user_input.get('behavior_type', '')}{user_input.get('personality_type', '')}",
            "shadow_trait": shadow_trait,
            "strength": strength,
            "weakness": weakness,
            "suitable_environment": suitable_environment,
            "job_situation": "在職中" if user_input.get("employment_status") == "在職中" else "転職活動中",
            "common_struggle": common_struggle,
            "suitable_jobs": suitable_jobs_short,
            "location": user_input.get("location", "東京都"),
            "manual_advice": manual_advice
        }
        
        if "II" in user_input.get("personality_type", ""):
             message = self._generate_ii_message(user_input, personality_info, format_args)
        else:
             try:
                message = template.format(**format_args)
             except KeyError as e:
                # テンプレートに必要なキーが不足している場合のフォールバック
                missing_key = str(e).strip("'")
                format_args[missing_key] = ""
                message = template.format(**format_args)
    
             # もしテンプレートで manual_advice が使われていないなら、末尾に追加する (Phase 1のみ)
             if "{manual_advice}" not in template and manual_advice and "Phase 1" in phase:
                  message += f"\n\n【キャリア分析メモ】\n{manual_advice[:300]}..." 

        # 戦略的アドバイスを生成
        strategic_advice = self._generate_strategic_advice(readiness, flag_analysis, user_input)
        
        return {
            "message": message,
            "readiness_score": readiness,
            "flag_analysis": flag_analysis,
            "strategic_advice": strategic_advice,
            "personality_info": {
                "summary": personality_info.get("summary", ""),
                "suitable_jobs": suitable_jobs_short
            }
        }

    def _generate_ii_message(self, user_input, personality_info, format_args):
        """
        II型(ハーモナー)専用のメッセージ生成ロジック (Deep Dive Ver.)
        心理的シェルターとなる文体と、行動類型ごとの刺さる言葉を生成
        """
        behavior_type = user_input.get("behavior_type", "")
        name = user_input.get("name", "")
        
        # 1. 鏡（Mirroring）: 抽象語を排除し、具体的な葛藤を言語化
        mirror_section = (
            f"{name}さん、診断ありがとうございます。\n"
            f"職場のピリついた空気感を敏感に察して、自分まで苦しくなってしまうことはありませんか？\n"
            f"あるいは、自分の仕事が手一杯でも、誰かに頼まれると断れない…そんな場面が目に浮かびます。"
        )
        
        # 2. 行動類型との相関ロジック
        behavior_section = ""
        if "達成型" in behavior_type:
             behavior_section = (
                 "周囲への気配りでご自身を後回しにしていませんか？\n"
                 "その誠実さが正当に報われる場所を、一緒に探したいです。"
             )
        elif "平和型" in behavior_type:
             behavior_section = (
                 "今は何も決まっておかなくて大丈夫です。\n"
                 "まずは、今抱えているしんどさを少しだけ軽くするお話をしませんか？"
             )
        elif "効率型" in behavior_type:
             behavior_section = (
                 "誰も見ていないところで頑張る姿勢、本当に素敵です。\n"
                 "あなたの縁の下の力持ちとしての貢献が、より穏やかな環境で発揮されるお手伝いをさせてください。"
             )
        else:
             # デフォルト
             behavior_section = "ご自身の気持ちを大切にできる環境が、きっとあります。"

        # 3. 影（Shadowing）: “警告”ではなく“純粋な心配”へ & 心理的安全性のある結び
        shadow_section = (
            f"このまま無理を続けて、{name}さんの自己犠牲の精神が限界にきてしまうことが、何より心配です。\n"
            f"「転職が成功します」とは言いません。\n"
            f"ただ、{name}さんの心が今より少しだけ軽くなる場所を、一緒に探すことはできるかもしれませんね。\n"
            f"まずは「こんなこと話していいのかな」と思うような小さなモヤモヤから、一度吐き出してみるというお気持ちはないでしょうか？"
        )
        
        # 結合
        full_message = f"{mirror_section}\n\n{behavior_section}\n\n{shadow_section}"
        
        return full_message
    
    def _generate_strategic_advice(self, readiness, flag_analysis, user_input):
        """戦略的アドバイスを生成"""
        score = readiness["total_score"]
        phase = readiness["phase_recommendation"]
        
        advice = []
        
        # Phaseに応じたアドバイス
        if "Phase 1" in phase:
            advice.append("まずは共感と信頼構築に徹してください。すぐに面談誘導はせず、診断結果の「影の性質」を突いてラポールを形成しましょう。")
        elif "Phase 2" in phase:
            advice.append("ラポールが形成されつつあります。職場あるあるや共感を8割にし、情報を小出しにして「もっと知りたい」という心理状態を作りましょう。")
        elif "Phase 3" in phase:
            advice.append("ReadinessScoreが高まっています。「10社応募の法則」などの市場教育を行い、転職のハードルを下げましょう。")
        else:  # Phase 4
            advice.append("面談誘導のタイミングです!「診断結果の全容を面談で解説」という情報の非対称性を使って予約を促しましょう。")
        
        # フラグに応じたアドバイス
        if flag_analysis["flag_count"] >= 2:
            advice.append(f"複数のフラグが立っています({', '.join(flag_analysis['active_flags'])})。緊急性が高いため、Phase移行を早めることを検討してください。")
        
        # 就職時期に応じたアドバイス
        if user_input.get("job_timing") in ["1. できるだけ早く", "2. 1～3か月"]:
            advice.append("就職時期が早いため、優先度を上げて対応しましょう。ただし焦らず、信頼感の醸成を最優先に。")
        
        return "\n\n".join(advice)
