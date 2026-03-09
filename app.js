// Populate hour dropdown
const hourSelect = document.getElementById('hour');
for (let i = 0; i < 24; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = i.toString().padStart(2, '0') + ':00';
    hourSelect.appendChild(opt);
}

// Populate day of month dropdown
const domSelect = document.getElementById('dom');
for (let i = 1; i <= 31; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = i;
    domSelect.appendChild(opt);
}

const fields = ['minute', 'hour', 'dom', 'month', 'dow'];
const customFields = ['minute-custom', 'hour-custom', 'dom-custom'];

// Listen for changes
fields.forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
        const customId = id + '-custom';
        const customEl = document.getElementById(customId);
        if (customEl) customEl.value = '';
        updateExpression();
    });
});

customFields.forEach(id => {
    document.getElementById(id).addEventListener('input', updateExpression);
});

function getFieldValue(name) {
    const customEl = document.getElementById(name + '-custom');
    if (customEl && customEl.value.trim()) return customEl.value.trim();
    return document.getElementById(name).value;
}

function updateExpression() {
    const parts = fields.map(getFieldValue);
    const expr = parts.join(' ');
    document.getElementById('expression').textContent = expr;
    document.getElementById('description').textContent = describeExpression(parts);
    showNextRuns(parts);
}

function describeExpression(parts) {
    const [min, hour, dom, month, dow] = parts;
    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    let desc = '';

    // Time part
    if (min === '*' && hour === '*') {
        desc = 'Every minute';
    } else if (min === '*') {
        desc = 'Every minute during hour ' + hour;
    } else if (hour === '*') {
        desc = 'At minute ' + min + ' of every hour';
    } else {
        const h = parseInt(hour);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
        desc = 'At ' + h12 + ':' + min.padStart(2, '0') + ' ' + ampm;
    }

    // Day of week
    if (dow === '1-5') {
        desc += ', Monday to Friday';
    } else if (dow === '0,6') {
        desc += ', weekends only';
    } else if (dow !== '*') {
        const d = parseInt(dow);
        if (!isNaN(d) && dayNames[d]) desc += ', every ' + dayNames[d];
    }

    // Day of month
    if (dom !== '*') {
        const suffix = getOrdinal(parseInt(dom));
        desc += ', on the ' + dom + suffix;
    }

    // Month
    if (month !== '*') {
        const m = parseInt(month);
        if (!isNaN(m) && monthNames[m]) desc += ' of ' + monthNames[m];
    }

    return desc;
}

function getOrdinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}

function showNextRuns(parts) {
    const list = document.getElementById('next-runs');
    list.innerHTML = '';
    
    const runs = calculateNextRuns(parts, 5);
    runs.forEach(date => {
        const li = document.createElement('li');
        li.textContent = date.toLocaleString('en-GB', {
            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
        list.appendChild(li);
    });
}

function calculateNextRuns(parts, count) {
    const [minP, hourP, domP, monthP, dowP] = parts;
    const results = [];
    const now = new Date();
    let check = new Date(now);
    check.setSeconds(0);
    check.setMilliseconds(0);
    check.setMinutes(check.getMinutes() + 1);

    let safety = 0;
    while (results.length < count && safety < 525600) {
        safety++;
        if (matchesField(check.getMonth() + 1, monthP) &&
            matchesField(check.getDate(), domP) &&
            matchesField(check.getDay(), dowP) &&
            matchesField(check.getHours(), hourP) &&
            matchesField(check.getMinutes(), minP)) {
            results.push(new Date(check));
        }
        check.setMinutes(check.getMinutes() + 1);
    }
    return results;
}

function matchesField(value, pattern) {
    if (pattern === '*') return true;
    
    // Handle comma-separated values
    const parts = pattern.split(',');
    for (const part of parts) {
        // Handle ranges like 1-5
        if (part.includes('-') && !part.includes('/')) {
            const [start, end] = part.split('-').map(Number);
            if (value >= start && value <= end) return true;
            continue;
        }
        // Handle steps like */5
        if (part.includes('/')) {
            const [range, step] = part.split('/');
            const s = parseInt(step);
            if (range === '*') {
                if (value % s === 0) return true;
            } else {
                const start = parseInt(range);
                if (value >= start && (value - start) % s === 0) return true;
            }
            continue;
        }
        if (parseInt(part) === value) return true;
    }
    return false;
}

function applyPreset(expr) {
    const parts = expr.split(' ');
    const ids = ['minute', 'hour', 'dom', 'month', 'dow'];
    ids.forEach((id, i) => {
        const select = document.getElementById(id);
        const customEl = document.getElementById(id + '-custom');
        if (customEl) customEl.value = '';
        
        // Try to set the select value
        const options = Array.from(select.options).map(o => o.value);
        if (options.includes(parts[i])) {
            select.value = parts[i];
        } else {
            select.value = '*';
            if (customEl) customEl.value = parts[i];
        }
    });
    updateExpression();
}

function copyExpression() {
    const expr = document.getElementById('expression').textContent;
    navigator.clipboard.writeText(expr).then(() => {
        const btn = document.getElementById('copy-btn');
        btn.textContent = '✅ Copied!';
        setTimeout(() => btn.textContent = '📋 Copy', 2000);
    });
}

// Initial render
updateExpression();
