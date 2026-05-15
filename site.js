// Shared site script for moods, activities, tips, and journal storage
(function(){
  // Utility: get / set journal entries
  const loadEntries = () => {
    try { return JSON.parse(localStorage.getItem('journalEntries') || '[]'); }
    catch(e){ return []; }
  };
  const saveEntries = (arr) => localStorage.setItem('journalEntries', JSON.stringify(arr));

  // Daily logs (meals/water/sleep + mood + journal) storage
  const loadDailyLogs = () => {
    try { return JSON.parse(localStorage.getItem('dailyLogs') || '{}'); }
    catch(e){ return {}; }
  };
  const saveDailyLogs = (obj) => localStorage.setItem('dailyLogs', JSON.stringify(obj));

  // Mood grid (daily.html) - now with emojis and more moods, including stronger emotions
  const moods = [
    { key: 'Happy', label: '😊 Happy', color: '#ffd166' },
    { key: 'Content', label: '🙂 Content', color: '#f4a261' },
    { key: 'Excited', label: '🤩 Excited', color: '#ff9f1c' },
    { key: 'Calm', label: '😌 Calm', color: '#8ecae6' },
    { key: 'Anxious', label: '😰 Anxious', color: '#f28482' },
    { key: 'Sad', label: '😢 Sad', color: '#90a4ae' },
    { key: 'Angry', label: '😡 Angry', color: '#ff6b6b' },
    { key: 'Lonely', label: '😔 Lonely', color: '#bdb2ff' },
    { key: 'Grateful', label: '🙏 Grateful', color: '#b7c7a3' },
    { key: 'Tired', label: '😴 Tired', color: '#a8dadc' },
    { key: 'Overwhelmed', label: '😵 Overwhelmed', color: '#ffb4a2' },
    { key: 'Panic', label: '😱 Panic', color: '#ff8fa3' },
    { key: 'Numb', label: '😶 Numb', color: '#cfd8dc' }
  ];

  const showDailyJournalSection = (moodKey) => {
    const section = document.getElementById('daily-journal-section');
    if(!section) return;
    const heading = document.getElementById('daily-journal-heading');
    const promptContainer = document.getElementById('daily-prompt');
    const moodData = moods.find(m => m.key === moodKey);
    if(heading) heading.textContent = `What made you feel ${moodData ? moodData.label : moodKey} today?`;
    if(promptContainer) promptContainer.textContent = '';
    section.style.display = 'block';
    const textarea = document.getElementById('daily-journal-text');
    if(textarea) textarea.placeholder = `Write what made you feel ${moodData ? moodData.label : moodKey} today...`;
  };

  const initMoodGrid = () => {
    const grid = document.getElementById('mood-grid');
    if(!grid) return;
    grid.innerHTML = '';
    moods.forEach(m => {
      const btn = document.createElement('button');
      btn.className = 'header-button mood-Btn';
      btn.style.minWidth = '120px';
      btn.textContent = m.label;
      btn.addEventListener('click', () => {
        localStorage.setItem('lastMood', m.key);
        const sel = document.getElementById('mood-selected');
        if (sel) sel.textContent = `Selected: ${m.label}`;
        showDailyJournalSection(m.key);
      });
      grid.appendChild(btn);
    });
    // show previously selected
    const prev = localStorage.getItem('lastMood');
    if(prev){
      const match = moods.find(x => x.key === prev);
      const sel = document.getElementById('mood-selected');
      if (sel) sel.textContent = `Selected: ${match ? match.label : prev}`;
      showDailyJournalSection(prev);
    }
  };

  // Activities generator
  const activities = [
    'Take a 10-minute walk outside',
    'Try a short guided breathing exercise',
    'Do a 5-minute stretch routine',
    'Write down three things you’re grateful for',
    'Listen to an uplifting song',
    'Make a warm cup of tea and sit quietly',
    'Try a short body-scan meditation',
    'Read a poem or short story',
    'Call or text a friend to check in',
    'Do a small art or doodle activity'
  ];

  // Mood-specific activity suggestions
  const activitiesByMood = {
    Happy: [
      'Share your happiness with a short message to a friend',
      'Dance to a favorite upbeat song',
      'Capture a photo of something that made you smile',
      'Write a positive note to yourself',
      'Play a song that boosts your mood',
      'Take a moment to celebrate a win'
    ],
    Content: [
      'Take a leisurely walk and notice surroundings',
      'Read a short chapter from a book',
      'Prepare a simple snack mindfully',
      'Tidy a small corner of your space',
      'Spend five minutes stretching gently',
      'Reflect on what made today steady'
    ],
    Excited: [
      'Channel energy into a quick creative task',
      'Do a short HIIT or cardio burst',
      'Plan a small fun activity for later today',
      'Write down your biggest dream for this week',
      'Sing along to a high-energy song',
      'Start a simple craft or project'
    ],
    Calm: [
      'Try a 10-minute mindful breathing exercise',
      'Practice gentle stretching',
      'Sip a warm drink and sit quietly',
      'Spend a few minutes watching clouds or sky',
      'Listen to soft instrumental music',
      'Write down what feels peaceful'
    ],
    Anxious: [
      'Try a grounding exercise: name 5 things you see',
      'Slow breathing for two minutes',
      'Write down one small next step to reduce worry',
      'Go outside for a short walk',
      'Use a fidget object or gentle movement',
      'Talk to someone you trust briefly'
    ],
    Sad: [
      'Reach out to a trusted friend',
      'Listen to comforting music',
      'Write one sentence about what you need right now',
      'Look at a photo that reminds you of good times',
      'Allow yourself a gentle break',
      'Write a small gratitude list'
    ],
    Angry: [
      'Take a brisk walk to release tension',
      'Do a short physical exercise',
      'Write down what triggered the feeling',
      'Punch a pillow or squeeze a stress ball',
      'Take five deep breaths and count slowly',
      'Write what would help you cool down'
    ],
    Lonely: [
      'Send a check-in message to someone you care about',
      'Join a short online community or forum thread',
      'Do a small kindness for yourself (make tea, light candle)',
      'Write a letter to yourself',
      'Call someone for a quick hello',
      'Spend a few minutes with a pet or nature'
    ],
    Grateful: [
      'Write a short thank-you note',
      'Reflect on three things that went well today',
      'Share gratitude with someone else',
      'Notice a small detail you appreciate',
      'Send a compliment to someone',
      'Write one thing you are proud of'
    ],
    Tired: [
      'Take a brief nap or rest with closed eyes',
      'Try a restorative stretch',
      'Lower lights and practice slow breathing',
      'Have a warming cup of tea',
      'Listen to slow ambient music',
      'Do a 10-minute guided relaxation',
      'Lie down and do a body-scan'
    ],
    Overwhelmed: [
      'Write a short list of what needs attention',
      'Break one task into a tiny step',
      'Take a short break and breathe slowly',
      'Put your phone away for 5 minutes',
      'Make space by clearing a small area',
      'Repeat a calming phrase to yourself'
    ],
    Panic: [
      'Name 5 things you can see and 4 you can touch',
      'Breathe in for 4, hold 4, out 4',
      'Sit down and focus on your feet',
      'Splash cold water on your face',
      'Tell yourself you are safe in this moment',
      'Write one calming instruction for yourself'
    ],
    Numb: [
      'Notice one object near you in detail',
      'Move your fingers or toes slowly',
      'Drink a glass of water mindfully',
      'Write one small sensation you feel',
      'Turn on a gentle song and notice how it feels',
      'Stretch slowly and observe your body'
    ]
  };

  // Prompts per mood (for users who prefer guided journaling)
  const promptsByMood = {
    Happy: ["What's one thing that made you smile today?","How can you share this joy with someone else?"],
    Content: ["What's one small win from today?","What would make today even a bit better?"],
    Excited: ["What's the most exciting part of today?","How can you channel this energy productively?"],
    Calm: ["What does calm feel like for you right now?","Where do you feel it in your body?"],
    Anxious: ["What's the smallest next step you can take to feel safer?","Name three things in the room you can focus on."],
    Sad: ["What's one gentle thing you can do for yourself now?","What helped you feel better in the past?"],
    Angry: ["What triggered this anger?","What boundary could help next time?"],
    Lonely: ["Who could you reach out to today?","What's something small you enjoy doing alone?"],
    Grateful: ["Who are you grateful for today?","What's a small thing that went right?"],
    Tired: ["What could help your rest tonight?","What's one small win despite tiredness?"],
    Overwhelmed: ["What's one small thing you can finish right now?","What can you put aside for later?"],
    Panic: ["Can you name 3 things you can see, 2 you can touch?","Breathe slowly for 4 counts. What's one manageable thing?"],
    Numb: ["What sensation do you notice right now?","What's a tiny action that might shift your state?"] 
  };

  const generatePromptForMood = (moodKey) => {
    const pool = promptsByMood[moodKey] || ['Write freely about how you feel.'];
    return getRandomItems(pool,1)[0];
  };

  // Export and import
  const exportData = () => {
    const payload = {
      journalEntries: loadEntries(),
      dailyLogs: loadDailyLogs()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mood-journal-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const importDataFromFile = (file) => {
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try{
        const obj = JSON.parse(e.target.result);
        if(obj.journalEntries) {
          saveEntries(obj.journalEntries);
        }
        if(obj.dailyLogs){
          saveDailyLogs(obj.dailyLogs);
        }
        alert('Import successful.');
        renderEntriesPage();
        renderCalendar();
        renderWeeklySummary();
      } catch(err){
        alert('Failed to import: invalid file');
      }
    };
    reader.readAsText(file);
  };

  // Delete daily log and any linked journal entry
  const deleteDailyLog = (dateKey) => {
    const logs = loadDailyLogs();
    if(!logs[dateKey]) return;
    const journalId = logs[dateKey].journalId;
    delete logs[dateKey];
    saveDailyLogs(logs);
    if(journalId){
      const entries = loadEntries().filter(e => e.id !== journalId);
      saveEntries(entries);
    }
    renderCalendar();
    renderEntriesPage();
    const details = document.getElementById('calendar-details');
    if(details) details.innerHTML = '<p>Entry deleted.</p>';
  };

  const getRandomItems = (arr, n=3) => {
    const copy = arr.slice();
    for(let i = copy.length -1; i>0; i--){
      const j = Math.floor(Math.random()*(i+1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0,n);
  };

  const renderActivities = (targetId='activities-list') => {
    const el = document.getElementById(targetId);
    if(!el) return;
    el.innerHTML = '';
    const mood = localStorage.getItem('lastMood');
    const pool = (mood && activitiesByMood[mood]) ? activitiesByMood[mood] : activities;
    const items = getRandomItems(pool, Math.min(4, pool.length));
    items.forEach(it => {
      const card = document.createElement('div');
      card.className = 'resource-card calm';
      card.style.width = '80%';
      card.innerHTML = `<h5>${it}</h5>`;
      el.appendChild(card);
    });
  };

  // Tips generator
  const tips = [
    'Breathe slowly for one minute.',
    'Write one small goal for today.',
    'Stand up and stretch your arms to the sky.',
    'Name five things you can see right now.',
    'Drink a glass of water mindfully.',
    'Send a short friendly message to someone.',
    'Take three slow, deep breaths before responding.'
  ];

  const renderTip = () => {
    const el = document.getElementById('tip-container');
    if(!el) return;
    const [t] = getRandomItems(tips,1);
    el.textContent = t;
  };

  // Journal save
  const saveJournalEntry = () => {
    const ta = document.getElementById('journal-text');
    if(!ta) return;
    const content = ta.value.trim();
    if(content.length < 1){
      ta.classList.add('error');
      return;
    }
    const entries = loadEntries();
    const entry = {
      id: Date.now(),
      created: new Date().toISOString(),
      dateKey: new Date().toISOString().slice(0,10),
      mood: localStorage.getItem('lastMood') || null,
      content
    };
    entries.unshift(entry);
    saveEntries(entries);

    // Also save a daily log (meals, water, sleep) if controls exist
    const dateKey = entry.dateKey;
    const dailyLogs = loadDailyLogs();
    const meals = document.getElementById('meals-select') ? document.getElementById('meals-select').value : null;
    const water = document.getElementById('water-select') ? document.getElementById('water-select').value : null;
    const sleep = document.getElementById('sleep-select') ? document.getElementById('sleep-select').value : null;
    dailyLogs[dateKey] = Object.assign({}, dailyLogs[dateKey] || {}, {
      mood: entry.mood,
      journalId: entry.id,
      meals, water, sleep,
      updated: new Date().toISOString()
    });
    saveDailyLogs(dailyLogs);

    // clear and redirect to view
    ta.value = '';
    window.location.href = 'view_entries.html';
  };

  // Render entries page
  const renderEntriesPage = () => {
    const list = document.getElementById('entries-list');
    if(!list) return;
    list.innerHTML = '';
    const entries = loadEntries();
    if(entries.length === 0){
      list.innerHTML = '<p>No entries yet. Create one from the Journal page.</p>';
      return;
    }
    entries.forEach(e => {
      const card = document.createElement('article');
      card.className = 'resource-card';
      card.style.width = '100%';
      const date = new Date(e.created).toLocaleString();
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
          <div style="flex:1;text-align:left;">
            <strong>${e.mood ? 'Mood: ' + e.mood : ''}</strong>
            <div style="font-size:0.9rem;color:var(--text-color);margin-top:6px;white-space:pre-wrap">${e.content}</div>
            <div style="margin-top:8px;font-size:0.8rem;color:var(--navi-bar-text);">${date}</div>
          </div>
          <div style="flex:0 0 auto;display:flex;flex-direction:column;gap:8px;margin-left:12px;">
            <button class="header-button" data-id="${e.id}">Delete</button>
          </div>
        </div>
      `;
      const delBtn = card.querySelector('button[data-id]');
      delBtn.addEventListener('click', () => {
        const remaining = loadEntries().filter(x => x.id !== e.id);
        saveEntries(remaining);
        renderEntriesPage();
      });
      list.appendChild(card);
    });
  };

  // Calendar renderer (calendar.html)
  const renderCalendar = (containerId='calendar-grid') => {
    const container = document.getElementById(containerId);
    if(!container) return;
    container.innerHTML = '';
    // Use currentMonth/currentYear if set, otherwise default to today
    const now = new Date();
    const year = (window._calendarYear !== undefined) ? window._calendarYear : now.getFullYear();
    const month = (window._calendarMonth !== undefined) ? window._calendarMonth : now.getMonth();
    const first = new Date(year, month, 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(year, month+1, 0).getDate();

    const dailyLogs = loadDailyLogs();

    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(7,1fr)';
    grid.style.gap = '6px';

    // weekday headers
    ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(w => {
      const h = document.createElement('div');
      h.style.fontWeight = '700';
      h.textContent = w;
      grid.appendChild(h);
    });

    // fill blanks
    for(let i=0;i<startDay;i++){
      const blank = document.createElement('div');
      grid.appendChild(blank);
    }

    for(let d=1; d<=daysInMonth; d++){
      const key = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const cell = document.createElement('div');
      cell.style.minHeight = '70px';
      cell.style.padding = '8px';
      cell.style.borderRadius = '8px';
      cell.style.background = 'var(--card-bg)';
      cell.style.cursor = 'pointer';
      const dayLabel = document.createElement('div');
      dayLabel.textContent = d;
      dayLabel.style.fontWeight = '700';
      cell.appendChild(dayLabel);
      if(dailyLogs[key] && dailyLogs[key].mood){
        const moodKey = dailyLogs[key].mood;
        const m = moods.find(x=>x.key===moodKey);
        if(m){
          const dot = document.createElement('div');
          dot.style.width = '18px';
          dot.style.height = '18px';
          dot.style.borderRadius = '50%';
          dot.style.background = m.color;
          dot.style.marginTop = '8px';
          cell.appendChild(dot);
        }
      }
      cell.addEventListener('click', () => {
        const info = dailyLogs[key];
        const details = document.getElementById('calendar-details');
        if(details){
          details.innerHTML = info ? `
            <h4>${key}</h4>
            <div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;">
              <strong>Mood:</strong>
              <span style="display:inline-flex;align-items:center;padding:4px 12px;border-radius:999px;background:${(moods.find(x=>x.key===info.mood)||{color:'var(--accent-color-medium)'}).color};color:#fff;">
                ${info.mood || '—'}
              </span>
            </div>
            <div><strong>Meals:</strong> ${info.meals || '—'}</div>
            <div><strong>Water:</strong> ${info.water || '—'}</div>
            <div><strong>Sleep:</strong> ${info.sleep || '—'}</div>
            <div><strong>Journal:</strong> ${info.journalId ? (loadEntries().find(e=>e.id===info.journalId)||{content:'—'}).content : '—'}</div>
            ${key === new Date().toISOString().slice(0,10) ? '<div style="margin-top:8px;"><span style="display:inline-block;padding:4px 10px;border-radius:999px;background:var(--accent-color-green);color:#fff;font-weight:700;">Today</span></div>' : ''}
            <div style="margin-top:8px;display:flex;gap:8px;justify-content:flex-end;">
              <button id="delete-log-btn" class="header-button">Delete Log</button>
              <button id="edit-log-btn" class="header-button">Edit Entry</button>
            </div>
          ` : '<p>No data for this day.</p>';
          // wire delete
          setTimeout(()=>{
            const del = document.getElementById('delete-log-btn');
            if(del) del.addEventListener('click', ()=> deleteDailyLog(key));
            const edit = document.getElementById('edit-log-btn');
            if(edit) edit.addEventListener('click', ()=>{
              // open journal page and focus on text for this entry if exists
              const info = loadDailyLogs()[key];
              if(info && info.journalId){
                const entry = loadEntries().find(e=>e.id===info.journalId);
                if(entry){
                  // navigate to journal with query param id
                  window.location.href = `journal.html?edit=${entry.id}`;
                }
              } else {
                // open journal and preselect mood & open textarea
                localStorage.setItem('lastMood', info ? info.mood : '');
                window.location.href = 'daily.html';
              }
            });
          },50);
        }
      });
      grid.appendChild(cell);
    }

    container.appendChild(grid);
    // update calendar header
    const header = document.getElementById('calendar-current');
    if(header) header.textContent = `${first.toLocaleString(undefined,{month:'long'})} ${year}`;
  };

  // Calendar navigation helpers
  const calendarPrev = () => {
    if(window._calendarMonth === undefined) window._calendarMonth = new Date().getMonth();
    if(window._calendarYear === undefined) window._calendarYear = new Date().getFullYear();
    window._calendarMonth -= 1;
    if(window._calendarMonth < 0){ window._calendarMonth = 11; window._calendarYear -= 1; }
    renderCalendar();
  };
  const calendarNext = () => {
    if(window._calendarMonth === undefined) window._calendarMonth = new Date().getMonth();
    if(window._calendarYear === undefined) window._calendarYear = new Date().getFullYear();
    window._calendarMonth += 1;
    if(window._calendarMonth > 11){ window._calendarMonth = 0; window._calendarYear += 1; }
    renderCalendar();
  };

  // Weekly summary (last 7 days)
  const renderWeeklySummary = (containerId='weekly-summary') => {
    const container = document.getElementById(containerId);
    if(!container) return;
    const canvas = document.getElementById('weekly-chart');
    const legend = document.getElementById('weekly-legend');
    const statsEl = document.getElementById('weekly-stats');
    const fallback = document.getElementById('weekly-text-fallback');
    const logs = loadDailyLogs();
    const today = new Date();
    const last7 = [];
    for(let i=0;i<7;i++){
      const d = new Date(); d.setDate(today.getDate()-i);
      const key = d.toISOString().slice(0,10);
      last7.push({ key, data: logs[key] || null });
    }
    // aggregate moods
    const moodCounts = {};
    let totalSleep = 0, sleepCount = 0, totalWater = 0, waterCount = 0;
    last7.forEach(x=>{
      if(x.data && x.data.mood){ moodCounts[x.data.mood] = (moodCounts[x.data.mood]||0)+1; }
      if(x.data && x.data.sleep){ totalSleep += Number(x.data.sleep); sleepCount++; }
      if(x.data && x.data.water){ totalWater += Number(x.data.water); waterCount++; }
    });
    if(statsEl) {
      statsEl.innerHTML = `<h4>Stats</h4>
        <div>Average sleep: ${sleepCount? (totalSleep/sleepCount).toFixed(1) + ' hrs' : '—'}</div>
        <div>Average water: ${waterCount? (totalWater/waterCount).toFixed(1) + ' cups' : '—'}</div>`;
    }
    const labels = Object.keys(moodCounts);
    const values = labels.map(l => moodCounts[l]);
    const total = values.reduce((sum,v)=> sum+v, 0);
    if(canvas && canvas.getContext){
      const ctx = canvas.getContext('2d');
      if(!ctx){
        if(fallback) fallback.textContent = 'Weekly summary chart is unavailable in this browser.';
        return;
      }
      canvas.width = 700;
      canvas.height = 300;
      ctx.clearRect(0,0,canvas.width,canvas.height);
      if(total === 0){
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.font = '16px sans-serif';
        ctx.fillText('No mood data in the last 7 days', 20, 40);
        if(legend) legend.innerHTML = '';
        if(fallback) fallback.textContent = 'Record at least one mood entry to see a weekly chart.';
        return;
      }
      if(fallback) fallback.textContent = '';
      const palette = moods.map(m => m.color || '#888');
      let start = 0;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const radius = Math.min(cx, cy) - 30;
      labels.forEach((label, i) => {
        const slice = values[i] / total * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.fillStyle = palette[i % palette.length];
        ctx.arc(cx, cy, radius, start, start + slice);
        ctx.closePath();
        ctx.fill();
        start += slice;
      });
      if(legend) {
        legend.innerHTML = '';
        labels.forEach((label, i) => {
          const color = palette[i % palette.length];
          const item = document.createElement('div');
          item.style.marginBottom = '6px';
          item.innerHTML = `<span style="display:inline-block;width:14px;height:14px;background:${color};border-radius:3px;margin-right:8px;"></span>${label}: ${values[i]}`;
          legend.appendChild(item);
        });
      }
    } else {
      if(fallback) {
        fallback.textContent = total === 0 ? 'Record at least one mood entry to see a weekly summary.' : labels.map((label,i)=>`${label}: ${values[i]}`).join(' | ');
      }
    }
  };

  // attach event listeners when DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    initMoodGrid();
    const genBtn = document.getElementById('generate-activities');
    if(genBtn) {
      genBtn.addEventListener('click', () => renderActivities());
      // initial render
      renderActivities();
    }
    const genTip = document.getElementById('generate-tip');
    if(genTip){
      genTip.addEventListener('click', renderTip);
      renderTip();
    }
    const saveBtn = document.getElementById('save-entry-btn');
    if(saveBtn) saveBtn.addEventListener('click', saveJournalEntry);

    // Prompt generator on journal page
    const promptBtn = document.getElementById('prompt-btn');
    if(promptBtn){
      promptBtn.addEventListener('click', ()=>{
        const mood = localStorage.getItem('lastMood');
        const promptText = generatePromptForMood(mood);
        const container = document.getElementById('prompt-text');
        if(container) container.textContent = promptText;
      });
    }

    // If on journal page and page loaded with a mood, prefill selects from dailyLogs
    const mealsSel = document.getElementById('meals-select');
    const waterSel = document.getElementById('water-select');
    const sleepSel = document.getElementById('sleep-select');
    if(mealsSel || waterSel || sleepSel){
      const key = new Date().toISOString().slice(0,10);
      const logs = loadDailyLogs();
      if(logs[key]){
        if(mealsSel && logs[key].meals) mealsSel.value = logs[key].meals;
        if(waterSel && logs[key].water) waterSel.value = logs[key].water;
        if(sleepSel && logs[key].sleep) sleepSel.value = logs[key].sleep;
      }
    }

    // Daily page: wire prompt and save buttons
    const dailyPromptBtn = document.getElementById('daily-prompt-btn');
    if(dailyPromptBtn){
      dailyPromptBtn.addEventListener('click', ()=>{
        const mood = localStorage.getItem('lastMood');
        const prompt = generatePromptForMood(mood);
        const container = document.getElementById('daily-prompt');
        if(container) container.textContent = prompt;
      });
    }
    const dailySaveBtn = document.getElementById('daily-save-btn');
    if(dailySaveBtn){
      dailySaveBtn.addEventListener('click', ()=>{
        const ta = document.getElementById('daily-journal-text');
        if(!ta) return;
        const content = ta.value.trim();
        if(content.length < 1){ ta.classList.add('error'); return; }
        const mood = localStorage.getItem('lastMood') || null;
        const entries = loadEntries();
        const entry = { id: Date.now(), created: new Date().toISOString(), dateKey: new Date().toISOString().slice(0,10), mood, content };
        entries.unshift(entry); saveEntries(entries);
        // update daily logs
        const logs = loadDailyLogs();
        const key = entry.dateKey;
        logs[key] = Object.assign({}, logs[key] || {}, { mood: mood, journalId: entry.id, updated: new Date().toISOString() });
        saveDailyLogs(logs);
        ta.value = '';
        // Provide quick feedback and re-render calendar
        alert('Entry saved.');
        renderCalendar();
      });
    }

    // Calendar controls
    const prevBtn = document.getElementById('calendar-prev');
    const nextBtn = document.getElementById('calendar-next');
    if(prevBtn) prevBtn.addEventListener('click', calendarPrev);
    if(nextBtn) nextBtn.addEventListener('click', calendarNext);

    // Export/import wiring
    const exportBtn = document.getElementById('export-data');
    if(exportBtn) exportBtn.addEventListener('click', exportData);
    const importInput = document.getElementById('import-file');
    if(importInput) importInput.addEventListener('change', (e)=>{ importDataFromFile(e.target.files[0]); e.target.value = ''; });

    // render entries page if present
    renderEntriesPage();
    // render calendar and weekly if present
    renderCalendar();
    renderWeeklySummary();
  });

})();
