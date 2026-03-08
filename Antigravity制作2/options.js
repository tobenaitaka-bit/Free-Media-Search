// options.js — Save / load API keys via chrome.storage.local

document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    var pexelsInput = document.getElementById('pexelsKey');
    var pixabayInput = document.getElementById('pixabayKey');
    var saveBtn = document.getElementById('saveBtn');
    var saveMessage = document.getElementById('saveMessage');
    var formSection = document.getElementById('formSection');
    var successPanel = document.getElementById('successPanel');
    var openExtBtn = document.getElementById('openExtBtn');
    var editKeysBtn = document.getElementById('editKeysBtn');
    var closeTabBtn = document.getElementById('closeTabBtn');
    var closeHint = document.getElementById('closeHint');

    // Load saved keys on page open
    chrome.storage.local.get(['pexelsKey', 'pixabayKey'], function (result) {
        if (result.pexelsKey) pexelsInput.value = result.pexelsKey;
        if (result.pixabayKey) pixabayInput.value = result.pixabayKey;
    });

    // Save keys
    saveBtn.addEventListener('click', function () {
        var pexelsKey = pexelsInput.value.trim();
        var pixabayKey = pixabayInput.value.trim();

        if (!pexelsKey && !pixabayKey) {
            showMessage('少なくとも1つのAPIキーを入力してください。', 'error');
            return;
        }

        chrome.storage.local.set({
            pexelsKey: pexelsKey,
            pixabayKey: pixabayKey
        }, function () {
            if (chrome.runtime.lastError) {
                showMessage('⚠ 保存に失敗しました: ' + chrome.runtime.lastError.message, 'error');
            } else {
                // Hide form, show success panel
                saveMessage.className = 'save-message';
                formSection.classList.add('hidden');
                if (closeHint) closeHint.style.display = 'none'; // Reset hint on new save
                showSuccessPanel();
            }
        });
    });

    // "このタブを閉じる" button
    if (closeTabBtn) {
        closeTabBtn.addEventListener('click', function () {
            window.close();
            // Fallback if window didn't close (common in modern browsers if not opened by script)
            setTimeout(function () {
                if (closeHint) closeHint.style.display = 'block';
            }, 100);
        });
    }

    // "APIキーを追加・変更する" button — go back to form
    editKeysBtn.addEventListener('click', function () {
        hideSuccessPanel();
        if (closeHint) closeHint.style.display = 'none';
        formSection.classList.remove('hidden');
        // Reload saved keys into the form
        chrome.storage.local.get(['pexelsKey', 'pixabayKey'], function (result) {
            pexelsInput.value = result.pexelsKey || '';
            pixabayInput.value = result.pixabayKey || '';
            // Scroll to & focus the first empty field, or the first field
            if (!result.pexelsKey) {
                pexelsInput.focus();
            } else if (!result.pixabayKey) {
                pixabayInput.focus();
            } else {
                pexelsInput.focus();
            }
        });
    });

    // "拡張機能を使う" button — guide user to toolbar
    openExtBtn.addEventListener('click', function () {
        openExtBtn.textContent = '↑ ツールバーのアイコンをクリック！';
        openExtBtn.style.pointerEvents = 'none';
        openExtBtn.style.opacity = '0.7';
        setTimeout(function () {
            openExtBtn.innerHTML =
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>' +
                '拡張機能を使う';
            openExtBtn.style.pointerEvents = '';
            openExtBtn.style.opacity = '';
        }, 3000);
    });

    function showMessage(text, type) {
        saveMessage.textContent = text;
        saveMessage.className = 'save-message ' + type;
        saveMessage.style.animation = 'none';
        saveMessage.offsetHeight;
        saveMessage.style.animation = '';
    }

    function showSuccessPanel() {
        successPanel.classList.add('visible');
        successPanel.style.animation = 'none';
        successPanel.offsetHeight;
        successPanel.style.animation = '';
        successPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function hideSuccessPanel() {
        successPanel.classList.remove('visible');
    }
});
