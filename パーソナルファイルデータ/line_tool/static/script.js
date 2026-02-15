// LINE返信案生成ツール - JavaScript

document.getElementById('messageForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // フォームデータを取得
    const formData = {
        name: document.getElementById('name').value,
        personality_type: document.getElementById('personalityType').value,
        behavior_type: document.getElementById('behaviorType').value,
        employment_status: document.getElementById('employmentStatus').value,
        job_timing: document.getElementById('jobTiming').value,
        location: document.getElementById('location').value,
        education: document.getElementById('education').value,
        current_dissatisfaction_flag: document.getElementById('currentDissatisfaction').checked,
        future_anxiety_flag: document.getElementById('futureAnxiety').checked,
        skill_desire_flag: document.getElementById('skillDesire').checked,
        conversation_count: parseInt(document.getElementById('conversationCount').value),
        phase: document.getElementById('phase').value
    };
    
    // ローディング表示
    const submitButton = document.querySelector('.btn-primary');
    const originalText = submitButton.textContent;
    submitButton.textContent = '⏳ 生成中...';
    submitButton.disabled = true;
    
    try {
        // APIリクエスト
        const response = await fetch('/api/generate-message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            displayResult(result.data);
        } else {
            alert('エラー: ' + result.error);
        }
    } catch (error) {
        alert('通信エラーが発生しました: ' + error.message);
    } finally {
        submitButton.textContent = originalText;
        submitButton.disabled = false;
    }
});

// 画像分析ボタンのイベントリスナー
document.getElementById('analyzeBtn').addEventListener('click', async function() {
    const fileInput = document.getElementById('chatImage');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('画像ファイルを選択してください。');
        return;
    }
    
    const formData = new FormData();
    formData.append('image', file);
    
    const button = this;
    const originalText = button.textContent;
    button.textContent = '⏳ 分析中...';
    button.disabled = true;
    
    try {
        const response = await fetch('/api/analyze-image', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            const data = result.data;
            
            // フォームに値をセット
            if (data.conversation_count !== undefined) {
                document.getElementById('conversationCount').value = data.conversation_count;
            }
            if (data.phase) {
                document.getElementById('phase').value = data.phase;
            }
            if (data.current_dissatisfaction_flag !== undefined) {
                document.getElementById('currentDissatisfaction').checked = data.current_dissatisfaction_flag;
            }
            if (data.future_anxiety_flag !== undefined) {
                document.getElementById('futureAnxiety').checked = data.future_anxiety_flag;
            }
            if (data.skill_desire_flag !== undefined) {
                document.getElementById('skillDesire').checked = data.skill_desire_flag;
            }
            
            // 分析結果を通知
            alert('分析完了!\n' + data.analysis_comment);
        } else {
            alert('分析エラー: ' + result.error);
        }
    } catch (error) {
        alert('通信エラー: ' + error.message);
    } finally {
        button.textContent = originalText;
        button.disabled = false;
    }
});

function displayResult(data) {
    // 結果エリアを表示
    const resultContainer = document.getElementById('result');
    resultContainer.style.display = 'block';
    resultContainer.scrollIntoView({ behavior: 'smooth' });
    
    // LINE返信案を表示
    const messageOutput = document.getElementById('messageOutput');
    messageOutput.textContent = data.message;
    
    // ReadinessScoreを表示
    const scoreOutput = document.getElementById('scoreOutput');
    const score = data.readiness_score;
    const flagAnalysis = data.flag_analysis;
    
    scoreOutput.innerHTML = `
        <div class="score-card">
            <div class="score-main">
                <div class="score-value">${score.total_score}</div>
                <div class="score-label">点</div>
            </div>
            <div class="score-phase">${score.phase_recommendation}</div>
        </div>
        
        <div class="score-breakdown">
            <h4>スコア内訳</h4>
            <ul>
                ${Object.entries(score.breakdown).map(([key, value]) => 
                    `<li><strong>${key}:</strong> ${value}点</li>`
                ).join('')}
            </ul>
        </div>
        
        <div class="flag-status">
            <h4>フラグ状態</h4>
            <p><strong>緊急度:</strong> ${flagAnalysis.urgency_level}</p>
            ${flagAnalysis.active_flags.length > 0 ? `
                <ul>
                    ${flagAnalysis.active_flags.map(flag => `<li>${flag}</li>`).join('')}
                </ul>
            ` : '<p>アクティブなフラグはありません</p>'}
        </div>
    `;
    
    // 戦略的アドバイスを表示
    const adviceOutput = document.getElementById('adviceOutput');
    adviceOutput.innerHTML = data.strategic_advice.split('\n\n').map(advice => 
        `<p>${advice}</p>`
    ).join('');
}

function copyMessage() {
    const messageText = document.getElementById('messageOutput').textContent;
    
    navigator.clipboard.writeText(messageText).then(() => {
        const button = event.target;
        const originalText = button.textContent;
        button.textContent = '✅ コピーしました!';
        
        setTimeout(() => {
            button.textContent = originalText;
        }, 2000);
    }).catch(err => {
        alert('コピーに失敗しました: ' + err);
    });
}
