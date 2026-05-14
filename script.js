/*
Copyright © Andrew Bethell. All rights reserved.
Created by Andrew Bethell in his own time for his father following a stroke.

Version history:
v2_public_template_placeholders - Public-safe template with generic image placeholders, stable photo IDs, category colours, and About box.
v3_stacked_rows - Changed communication choices from tiled cards to stacked full-width rows with left image/icon space and right phrase text.
v4_zoom_comfort_swap - Added optional 4-second zoom images from images/zoom/, preserved speech on button taps, and swapped Comfort/My People top-menu positions.
v5_menu_image_submenus - Changed the main category menu into stacked image cards and moved phrase rows into category submenus.
v6_device_photo_voice_setup - Added Settings hub, local device photo setup, local recorded phrase voice clips, persistent storage request, and private media backup/import.
v7_locked_title_phrase_popup - Locked the top title bar, made only menu/phrase options scroll, changed submenu title display, and added a phrase popup for spoken text.
v8_titlebar_back_button - Removed the redundant submenu header and moved the Main menu button into the fixed title bar.
   v9_content_refinement - Prioritised clinical/accessibility menu order, added Quick Words, merged Entertainment into Activities, and refined phrase wording.
   v10_centered_submenu_rows - Vertically centred image/icon and text alignment in submenu phrase buttons.
   v11_image_cropper - Added local image cropper for selected photos and made submenu image slots larger.
   v12_ios_tts_no_subtitles - Improved iPhone/iPad device speech fallback, removed subtitles, and auto-closed the phrase popup after speech.
   v13_password_setup_compact_photo_voice - Password-protected Photo / Voice Setup, compacted setup controls, fixed crop shapes, allowed device camera/photo selection, hid top icons in submenus, and reduced the Main menu button size.
   v14_carer_content_setup - Rebuilt Content Management as a password-protected carer setup dashboard with top-menu rename/hide/reorder and one-selected-phrase editing.
   v15_safe_refresh_settings_only - Added Android/iPhone-safe app-code refresh, moved About into Settings only, and removed day/night and main-screen info buttons.
   v16_single_phrase_image_full_backup - Simplified phrase images to one cropped image used in rows and popups, added complete cross-device backup/restore, and downsized selected images.
   v17_separate_clear_images_audio - Added password-protected remove-all-images and remove-all-audio maintenance actions with confirm screens.
   v18_pc_tts_titlebar_split - Improved PC/browser text-to-speech fallback and split the submenu title bar into a back-arrow square plus title area.
   v19_custom_categories_editor_layout - Preserved custom imported top-menu categories and merged content/photo/voice editing into a cleaner editor-style management layout.
   v20_settings_editor_navigation_fix - Password now unlocks Settings once, content editor uses topic page -> phrase page navigation, and image picker previews update reliably.
   v21_settings_editor_table_cleanup - Added Enter-to-unlock, full-screen editor, image edit/delete/cancel popup, row-based phrase controls, fallback icon chooser, and table plus-row add controls.
   v22_settings_visual_tidy - Appearance-only tidy for Settings and in-app editor panels; no behaviour or backup schema changes.
   v23_settings_entry_cleanup - Removed oversized content editor intro, added Back to Settings, and disabled opening resize animation.
   v24_content_editor_fullscreen_fix - Forced the in-app content editor to open directly as a true full-screen overlay.
   v25_settings_navigation_refine - Settings now exits only from the main Settings menu; editor Save returns one level up.
   v26_stabilised_codebase - Stabilised settings/import/media handlers, removed duplicate backup-import hooks, and integrated patch behaviour without changing the backup schema.
   v27_simple_vocabulary_and_press_delay - Added optional simple vocabulary list view and configurable normal/long/longer press activation, saved locally and in complete backups as optional appSettings.
   v28_mobile_touch_interaction_lock - Prevented mobile text selection, callout/context menus, and image dragging during hold-to-speak while preserving scrolling.
   v30a_professional_visual_polish - Safe visual polish only: tactile button states, cleaner shadows/colours and editor readability.
   v32_settings_editor_polish - Visual-only polish for Settings and Content Editor; no behaviour/schema changes.
   v33_intro_button_popup_delay - Added configurable popup delay and optional introduction button saved as optional appSettings/media records.
*/

// ============================================================================
// DATA PERSISTENCE FUNCTIONS
// ============================================================================

const STORAGE_KEY = 'mynewvoice_public_template_v9';
const CATEGORY_CONFIG_KEY = 'mynewvoice_category_config_v14';
const APP_SETTINGS_KEY = 'mynewvoice_app_settings_v27';
const MANAGEMENT_PASSWORD = "19Hector";
const DEFAULT_IMAGE = '';
const MAIN_MENU_PROMPT = 'Select a button to speak...';
const INTRODUCTION_ITEM_ID = 'introduction';
const INTRODUCTION_IMAGE_KEY = 'intro:image';
const INTRODUCTION_VOICE_KEY = 'voice:introduction';
const CLICK_SOUND = new Audio('assets/sounds/click.mp3');
CLICK_SOUND.volume = 0.3; // keep it gentle

const ZOOM_IMAGE_FOLDER = 'images/zoom';
const MENU_IMAGE_FOLDER = 'images/menu';
const ZOOM_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
let zoomImageTimer = null;
let phrasePopupTimer = null;
let phrasePopupToken = 0;
let phrasePopupMinimumCloseTime = 0;
let currentViewCategory = null;


// ============================================================================
// PRIVATE DEVICE MEDIA STORAGE
// v12: iPhone/iPad text-to-speech fallback starts synchronously when no local recording exists.
// Local photos and recorded voices are stored only on the current device/browser.
// They are not uploaded to GitHub and are preserved between app launches unless
// browser/site data is cleared. Export/import is provided for backup.
// ============================================================================

const PRIVATE_MEDIA_DB_NAME = 'MyNewVoicePrivateMedia';
const PRIVATE_MEDIA_DB_VERSION = 1;
const PRIVATE_MEDIA_STORE = 'media';
const PRIVATE_MEDIA_BACKUP_TYPE = 'mynewvoice-private-media-backup';
const FULL_APP_BACKUP_TYPE = 'mynewvoice-complete-backup';
const CURRENT_APP_VERSION = 'v33';
const PRIVATE_IMAGE_MAX_SIZE = 900;
const PRIVATE_IMAGE_JPEG_QUALITY = 0.82;
const PRIVATE_CROP_OUTPUTS = {
    menu: { width: 800, height: 800, aspect: 1, shape: 'square', label: 'main menu button picture' },
    phrase: { width: 600, height: 600, aspect: 1, shape: 'square', label: 'phrase picture' },
    people: { width: 600, height: 600, aspect: 1, shape: 'circle', label: 'person photo' },
    zoom: { width: 600, height: 600, aspect: 1, shape: 'square', label: 'phrase picture' }
};
let pendingPasswordAction = 'management';
let privateSetupSelectedItem = null;
let privateMediaDbPromise = null;
let privateMediaObjectUrls = new Map();
let activeRecorder = null;
let activeRecorderChunks = [];
let activeRecorderStream = null;
let activeRecordingKey = null;
let activeRecordingButton = null;
let privateVoiceKeySet = new Set();
let privateMediaIndexReady = false;
let contentEditorScreen = 'topics';
let activeSpeechUtterance = null;
let speechVoicesReadyPromise = null;
let speechSynthesisPrimed = false;

function openPrivateMediaDb() {
    if (privateMediaDbPromise) return privateMediaDbPromise;

    privateMediaDbPromise = new Promise((resolve, reject) => {
        if (!('indexedDB' in window)) {
            reject(new Error('IndexedDB is not available in this browser.'));
            return;
        }

        const request = indexedDB.open(PRIVATE_MEDIA_DB_NAME, PRIVATE_MEDIA_DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(PRIVATE_MEDIA_STORE)) {
                const store = db.createObjectStore(PRIVATE_MEDIA_STORE, { keyPath: 'id' });
                store.createIndex('type', 'type', { unique: false });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Could not open private media storage.'));
    });

    return privateMediaDbPromise;
}

async function privateMediaTransaction(mode, callback) {
    const db = await openPrivateMediaDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(PRIVATE_MEDIA_STORE, mode);
        const store = transaction.objectStore(PRIVATE_MEDIA_STORE);
        let request;

        try {
            request = callback(store);
        } catch (error) {
            reject(error);
            return;
        }

        transaction.oncomplete = () => resolve(request && 'result' in request ? request.result : undefined);
        transaction.onerror = () => reject(transaction.error || new Error('Private media transaction failed.'));
        transaction.onabort = () => reject(transaction.error || new Error('Private media transaction aborted.'));
    });
}

async function getPrivateMediaRecord(id) {
    if (!id) return null;
    try {
        return await privateMediaTransaction('readonly', store => store.get(id));
    } catch (error) {
        console.warn('Could not read private media:', error);
        return null;
    }
}

async function putPrivateMediaRecord(id, type, blob, meta = {}) {
    if (!id || !blob) throw new Error('Missing media id or blob.');

    const record = {
        id,
        type,
        blob,
        mime: blob.type || meta.mime || 'application/octet-stream',
        label: meta.label || '',
        text: meta.text || '',
        updatedAt: new Date().toISOString()
    };

    await privateMediaTransaction('readwrite', store => store.put(record));
    if (type === 'voice') privateVoiceKeySet.add(id);
    revokePrivateMediaUrl(id);
    return record;
}

async function deletePrivateMediaRecord(id) {
    if (!id) return;
    await privateMediaTransaction('readwrite', store => store.delete(id));
    privateVoiceKeySet.delete(id);
    revokePrivateMediaUrl(id);
}

async function getAllPrivateMediaRecords() {
    try {
        return await privateMediaTransaction('readonly', store => store.getAll());
    } catch (error) {
        console.warn('Could not read all private media:', error);
        return [];
    }
}

async function refreshPrivateVoiceKeyIndex() {
    const records = await getAllPrivateMediaRecords();
    privateVoiceKeySet = new Set(records.filter(record => record && record.type === 'voice').map(record => record.id));
    privateMediaIndexReady = true;
    return privateVoiceKeySet;
}

function hasKnownPrivateVoice(buttonInfo) {
    const key = getPrivateMediaKey('voice', buttonInfo);
    return Boolean(key && privateVoiceKeySet.has(key));
}

async function clearPrivateMediaRecords() {
    await privateMediaTransaction('readwrite', store => store.clear());
    privateVoiceKeySet.clear();
    privateMediaIndexReady = true;
    revokeAllPrivateMediaUrls();
}

async function clearPrivateMediaRecordsByType(recordType) {
    const records = await getAllPrivateMediaRecords();
    const matchingRecords = records.filter(record => record && record.type === recordType);
    for (const record of matchingRecords) {
        await deletePrivateMediaRecord(record.id);
    }
    if (recordType === 'voice') {
        await refreshPrivateVoiceKeyIndex();
    }
    return matchingRecords.length;
}

function getPrivateMediaKey(kind, idOrItem) {
    const id = typeof idOrItem === 'string' ? idOrItem : (idOrItem && idOrItem.id);
    if (!id) return '';
    return `${kind}:${id}`;
}

function revokePrivateMediaUrl(id) {
    const url = privateMediaObjectUrls.get(id);
    if (url) URL.revokeObjectURL(url);
    privateMediaObjectUrls.delete(id);
}

function revokeAllPrivateMediaUrls() {
    privateMediaObjectUrls.forEach(url => URL.revokeObjectURL(url));
    privateMediaObjectUrls.clear();
}

async function getPrivateMediaObjectUrl(id) {
    if (!id) return '';
    if (privateMediaObjectUrls.has(id)) return privateMediaObjectUrls.get(id);

    const record = await getPrivateMediaRecord(id);
    if (!record || !record.blob) return '';

    const url = URL.createObjectURL(record.blob);
    privateMediaObjectUrls.set(id, url);
    return url;
}

async function applyPrivateImageToElement(img, privateKey, fallbackElement) {
    if (!img || !privateKey) return false;

    const localUrl = await getPrivateMediaObjectUrl(privateKey);
    if (!localUrl) return false;

    img.onload = () => {
        img.classList.add('loaded');
        img.style.display = '';
        if (fallbackElement) fallbackElement.style.display = 'none';
        if (fallbackElement) fallbackElement.hidden = true;
    };
    img.onerror = () => {
        img.style.display = 'none';
        if (fallbackElement) {
            fallbackElement.hidden = false;
            fallbackElement.style.display = '';
        }
    };
    img.src = localUrl;
    return true;
}

function applyPrivateImagesIn(rootElement = document) {
    const mediaImages = rootElement.querySelectorAll('img[data-private-media-key]');
    mediaImages.forEach(img => {
        const fallback = img.parentElement ? img.parentElement.querySelector('.button-fallback-icon, .menu-card-fallback, .profile-fallback-icon, .management-thumb-fallback') : null;
        applyPrivateImageToElement(img, img.dataset.privateMediaKey, fallback);
    });
}

function readBlobAsDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error('Could not read file.'));
        reader.readAsDataURL(blob);
    });
}

async function dataUrlToBlob(dataUrl) {
    const response = await fetch(dataUrl);
    return await response.blob();
}

function resizeImageFile(file, maxSize = PRIVATE_IMAGE_MAX_SIZE, quality = PRIVATE_IMAGE_JPEG_QUALITY) {
    return new Promise((resolve) => {
        if (!file || !file.type || !file.type.startsWith('image/')) {
            resolve(file);
            return;
        }

        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            try {
                const largestSide = Math.max(img.width, img.height);
                if (largestSide <= maxSize) {
                    URL.revokeObjectURL(objectUrl);
                    resolve(file);
                    return;
                }

                const scale = maxSize / largestSide;
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                canvas.toBlob((blob) => {
                    URL.revokeObjectURL(objectUrl);
                    resolve(blob || file);
                }, 'image/jpeg', quality);
            } catch (error) {
                console.warn('Image resize failed; storing original file.', error);
                URL.revokeObjectURL(objectUrl);
                resolve(file);
            }
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(file);
        };

        img.src = objectUrl;
    });
}


function getPrivateMediaKindFromKey(key) {
    if (!key || !key.includes(':')) return 'phrase';
    const kind = key.split(':')[0];
    return kind === 'menu' || kind === 'zoom' ? kind : 'phrase';
}

function getCropConfigForKey(key) {
    const kind = getPrivateMediaKindFromKey(key);
    if (kind === 'phrase' && /^phrase:people/i.test(String(key || ''))) {
        return PRIVATE_CROP_OUTPUTS.people;
    }
    return PRIVATE_CROP_OUTPUTS[kind] || PRIVATE_CROP_OUTPUTS.phrase;
}

function ensureImageCropOverlay() {
    let overlay = document.getElementById('imageCropOverlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'imageCropOverlay';
    overlay.className = 'image-crop-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'imageCropTitle');
    overlay.innerHTML = `
        <div class="image-crop-panel">
            <div class="image-crop-header">
                <div>
                    <h3 id="imageCropTitle">Crop photo</h3>
                    <p id="imageCropHelp">Drag the crop box. Use the corner handles to resize it.</p>
                </div>
                <button type="button" class="settings-close" data-crop-cancel aria-label="Cancel crop">×</button>
            </div>
            <div class="image-crop-mode-row" aria-live="polite">
                <span id="imageCropShapeLabel" class="crop-shape-label">Fixed crop shape</span>
            </div>
            <div class="image-crop-stage" id="imageCropStage">
                <img id="imageCropPreview" alt="Selected photo preview">
                <div id="imageCropBox" class="image-crop-box" tabindex="0" aria-label="Crop selection">
                    <span class="crop-handle crop-handle-nw" data-handle="nw" aria-hidden="true"></span>
                    <span class="crop-handle crop-handle-ne" data-handle="ne" aria-hidden="true"></span>
                    <span class="crop-handle crop-handle-sw" data-handle="sw" aria-hidden="true"></span>
                    <span class="crop-handle crop-handle-se" data-handle="se" aria-hidden="true"></span>
                </div>
            </div>
            <div class="image-crop-actions">
                <button type="button" class="management-btn close-btn" data-crop-cancel>Cancel</button>
                <button type="button" class="management-btn" data-crop-save>Save cropped photo</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
}

function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function openImageCropper(file, options = {}) {
    return new Promise((resolve, reject) => {
        const overlay = ensureImageCropOverlay();
        const stage = overlay.querySelector('#imageCropStage');
        const img = overlay.querySelector('#imageCropPreview');
        const cropBox = overlay.querySelector('#imageCropBox');
        const title = overlay.querySelector('#imageCropTitle');
        const help = overlay.querySelector('#imageCropHelp');
        const shapeLabel = overlay.querySelector('#imageCropShapeLabel');
        const saveButton = overlay.querySelector('[data-crop-save]');
        const cancelButtons = overlay.querySelectorAll('[data-crop-cancel]');

        let objectUrl = URL.createObjectURL(file);
        let selectedShape = options.shape || (options.aspect === 1 ? 'square' : 'rectangle');
        let aspect = selectedShape === 'circle' ? 1 : (options.aspect || 1);
        let crop = { x: 0, y: 0, width: 100, height: 100 };
        let imageBounds = { left: 0, top: 0, width: 100, height: 100 };
        let pointerState = null;
        let settled = false;

        const cleanup = () => {
            overlay.classList.remove('show');
            overlay.style.display = 'none';
            URL.revokeObjectURL(objectUrl);
            saveButton.removeEventListener('click', saveCrop);
            cancelButtons.forEach(btn => btn.removeEventListener('click', cancelCrop));
            cropBox.removeEventListener('pointerdown', handlePointerDown);
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('resize', syncImageBoundsAndCrop);
            cropBox.classList.remove('circle-crop');
        };

        const finishResolve = (blob) => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve(blob);
        };

        const finishReject = (error) => {
            if (settled) return;
            settled = true;
            cleanup();
            reject(error || new Error('Crop cancelled.'));
        };

        const getStagePoint = (event) => {
            const stageRect = stage.getBoundingClientRect();
            return { x: event.clientX - stageRect.left, y: event.clientY - stageRect.top };
        };

        const renderCropBox = () => {
            cropBox.style.left = `${crop.x}px`;
            cropBox.style.top = `${crop.y}px`;
            cropBox.style.width = `${crop.width}px`;
            cropBox.style.height = `${crop.height}px`;
        };

        const setCenteredCrop = () => {
            const margin = 0.08;
            let width = imageBounds.width * (1 - margin * 2);
            let height = width / aspect;
            if (height > imageBounds.height * (1 - margin * 2)) {
                height = imageBounds.height * (1 - margin * 2);
                width = height * aspect;
            }
            width = Math.max(50, width);
            height = Math.max(50, height);
            crop = {
                x: imageBounds.left + (imageBounds.width - width) / 2,
                y: imageBounds.top + (imageBounds.height - height) / 2,
                width,
                height
            };
            renderCropBox();
        };

        const syncImageBoundsAndCrop = () => {
            const stageRect = stage.getBoundingClientRect();
            const imgRect = img.getBoundingClientRect();
            imageBounds = {
                left: imgRect.left - stageRect.left,
                top: imgRect.top - stageRect.top,
                width: imgRect.width,
                height: imgRect.height
            };
            setCenteredCrop();
        };

        const fitCropWithinImage = () => {
            const minSize = Math.min(50, imageBounds.width, imageBounds.height);
            if (crop.width > imageBounds.width) {
                crop.width = imageBounds.width;
                crop.height = crop.width / aspect;
            }
            if (crop.height > imageBounds.height) {
                crop.height = imageBounds.height;
                crop.width = crop.height * aspect;
            }
            crop.width = Math.max(minSize, crop.width);
            crop.height = Math.max(minSize, crop.height);
            crop.x = clampNumber(crop.x, imageBounds.left, imageBounds.left + imageBounds.width - crop.width);
            crop.y = clampNumber(crop.y, imageBounds.top, imageBounds.top + imageBounds.height - crop.height);
        };

        const handlePointerDown = (event) => {
            event.preventDefault();
            cropBox.setPointerCapture?.(event.pointerId);
            const point = getStagePoint(event);
            const handle = event.target && event.target.dataset ? event.target.dataset.handle : '';
            pointerState = {
                mode: handle ? 'resize' : 'move',
                handle,
                startX: point.x,
                startY: point.y,
                startCrop: { ...crop }
            };
        };

        const handlePointerMove = (event) => {
            if (!pointerState) return;
            event.preventDefault();
            const point = getStagePoint(event);
            const dx = point.x - pointerState.startX;
            const dy = point.y - pointerState.startY;
            const start = pointerState.startCrop;

            if (pointerState.mode === 'move') {
                crop.x = clampNumber(start.x + dx, imageBounds.left, imageBounds.left + imageBounds.width - crop.width);
                crop.y = clampNumber(start.y + dy, imageBounds.top, imageBounds.top + imageBounds.height - crop.height);
                renderCropBox();
                return;
            }

            const handle = pointerState.handle;
            const movingRight = handle.includes('e');
            const movingDown = handle.includes('s');
            const anchorX = movingRight ? start.x : start.x + start.width;
            const anchorY = movingDown ? start.y : start.y + start.height;
            const rawWidth = Math.abs(point.x - anchorX);
            const rawHeight = Math.abs(point.y - anchorY);
            let width = Math.max(50, rawWidth);
            let height = width / aspect;
            if (height > rawHeight && rawHeight >= 50) {
                height = rawHeight;
                width = height * aspect;
            }

            width = Math.min(width, imageBounds.width);
            height = width / aspect;
            if (height > imageBounds.height) {
                height = imageBounds.height;
                width = height * aspect;
            }

            let x = movingRight ? anchorX : anchorX - width;
            let y = movingDown ? anchorY : anchorY - height;

            crop = { x, y, width, height };
            fitCropWithinImage();
            renderCropBox();
        };

        const handlePointerUp = () => {
            pointerState = null;
        };

        const cancelCrop = () => finishReject(new Error('Crop cancelled.'));

        const saveCrop = () => {
            try {
                const scaleX = img.naturalWidth / imageBounds.width;
                const scaleY = img.naturalHeight / imageBounds.height;
                const sourceX = Math.round((crop.x - imageBounds.left) * scaleX);
                const sourceY = Math.round((crop.y - imageBounds.top) * scaleY);
                const sourceW = Math.round(crop.width * scaleX);
                const sourceH = Math.round(crop.height * scaleY);
                const configuredWidth = options.outputWidth || 700;
                const configuredHeight = options.outputHeight || Math.round(configuredWidth / aspect);
                const outputWidth = configuredWidth;
                const outputHeight = configuredHeight;
                const canvas = document.createElement('canvas');
                canvas.width = outputWidth;
                canvas.height = outputHeight;
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                if (selectedShape === 'circle') {
                    ctx.clearRect(0, 0, outputWidth, outputHeight);
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(outputWidth / 2, outputHeight / 2, Math.min(outputWidth, outputHeight) / 2, 0, Math.PI * 2);
                    ctx.closePath();
                    ctx.clip();
                    ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, outputWidth, outputHeight);
                    ctx.restore();
                    canvas.toBlob((blob) => {
                        if (!blob) finishReject(new Error('Could not crop image.'));
                        else finishResolve(blob);
                    }, 'image/png');
                    return;
                }

                ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, outputWidth, outputHeight);
                canvas.toBlob((blob) => {
                    if (!blob) {
                        finishReject(new Error('Could not crop image.'));
                        return;
                    }
                    finishResolve(blob);
                }, 'image/jpeg', PRIVATE_IMAGE_JPEG_QUALITY);
            } catch (error) {
                finishReject(error);
            }
        };

        const shapeText = selectedShape === 'circle' ? 'circle' : selectedShape === 'rectangle' ? 'rectangle' : 'square';
        title.textContent = `Crop ${options.label || 'photo'}`;
        help.textContent = selectedShape === 'circle'
            ? 'Move and resize the circle so the face or important part is inside it. Save when ready.'
            : 'Move and resize the crop box so the important part is inside it. Save when ready.';
        if (shapeLabel) shapeLabel.textContent = `Fixed ${shapeText} crop`;
        cropBox.classList.toggle('circle-crop', selectedShape === 'circle');

        img.onload = () => {
            overlay.style.display = 'flex';
            requestAnimationFrame(() => {
                overlay.classList.add('show');
                syncImageBoundsAndCrop();
                cropBox.focus({ preventScroll: true });
            });
        };
        img.onerror = () => finishReject(new Error('Could not load selected image.'));
        img.src = objectUrl;

        saveButton.addEventListener('click', saveCrop);
        cancelButtons.forEach(btn => btn.addEventListener('click', cancelCrop));
        cropBox.addEventListener('pointerdown', handlePointerDown);
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('resize', syncImageBoundsAndCrop);
    });
}

async function playPrivateVoiceForPhrase(buttonInfo, buttonElement, popupToken = null) {
    const text = buttonInfo && buttonInfo.text ? buttonInfo.text : '';
    const key = getPrivateMediaKey('voice', buttonInfo);
    if (!key) return false;

    const record = await getPrivateMediaRecord(key);
    if (!record || !record.blob) return false;

    try {
        window.speechSynthesis.cancel();

        if (typeof CLICK_SOUND !== 'undefined' && CLICK_SOUND) {
            CLICK_SOUND.currentTime = 0;
            CLICK_SOUND.play().catch(() => {});
        }

        if (buttonElement) buttonElement.classList.add('speaking');

        const url = URL.createObjectURL(record.blob);
        const audio = new Audio(url);
        audio.volume = 1.0;

        const finishPlayback = () => {
            URL.revokeObjectURL(url);
            if (buttonElement) buttonElement.classList.remove('speaking');
            if (popupToken) closePhrasePopupAfterMinimum(popupToken);
        };

        audio.onended = finishPlayback;
        audio.onerror = finishPlayback;

        await audio.play();
        return true;
    } catch (error) {
        console.warn('Private voice playback failed; falling back to text-to-speech.', error);
        if (buttonElement) buttonElement.classList.remove('speaking');
        return false;
    }
}

function speakPhrase(buttonInfo, buttonElement) {
    const popupToken = showPhrasePopup(buttonInfo);

    // iPhone/iPad Safari can fail generated speech if speechSynthesis is started
    // only after an asynchronous IndexedDB lookup. Use a synchronous local voice
    // index so phrases without recordings call text-to-speech immediately within
    // the original tap event.
    if (!hasKnownPrivateVoice(buttonInfo)) {
        speakText(buttonInfo.text || '', buttonElement, { popupToken, showPopup: false });
        return;
    }

    playPrivateVoiceForPhrase(buttonInfo, buttonElement, popupToken).then(playedPrivateVoice => {
        if (!playedPrivateVoice) {
            speakText(buttonInfo.text || '', buttonElement, { popupToken, showPopup: false });
        }
    });
}

function getCategoryEntriesForSetup(includeHidden = true) {
    if (typeof getCategoryOrder === 'function') {
        return getCategoryOrder({ includeHidden });
    }
    return Array.from(document.querySelectorAll('.tab')).map(tab => tab.getAttribute('data-category')).filter(Boolean);
}

function getPhraseFilenameForSetup(category, phrase) {
    if (!phrase) return '';
    if (phrase.image) return `images/${category}/${phrase.image}`;
    const id = phrase.id || '';
    return id ? `images/${category}/${id}.jpg` : '';
}

function ensureSettingsOverlay() {
    let overlay = document.getElementById('settingsOverlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'settingsOverlay';
    overlay.className = 'settings-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'settingsTitle');
    overlay.innerHTML = `
        <div class="settings-panel">
            <div class="settings-header">
                <h3 id="settingsTitle">Settings</h3>
            </div>
            <div class="settings-preferences" aria-label="Communication display settings">
                <label for="settingsDisplayMode">Display mode</label>
                <select id="settingsDisplayMode" class="settings-select">
                    <option value="menu">Menu view - choose a section first</option>
                    <option value="simple-list">Simple vocabulary list - show all phrases</option>
                </select>
                <p class="settings-help">Simple vocabulary list removes the top menu cards and shows all phrases grouped by section in one scrolling list.</p>
                <label for="settingsPressActivation">Button press time</label>
                <select id="settingsPressActivation" class="settings-select">
                    <option value="normal">Normal tap</option>
                    <option value="long">Long press to speak</option>
                    <option value="longer">Longer press to speak</option>
                </select>
                <p class="settings-help">Use long press if accidental swipes or brushes trigger phrase buttons.</p>
                <label for="settingsPopupCloseDelay">Popup close delay after speech: <span id="settingsPopupCloseDelayValue">2 seconds</span></label>
                <input id="settingsPopupCloseDelay" class="settings-range" type="range" min="1" max="5" step="1" value="2">
                <p class="settings-help">Choose how long the spoken phrase picture/text stays open after speech finishes.</p>
                <label for="settingsIntroductionEnabled">Introduction button</label>
                <select id="settingsIntroductionEnabled" class="settings-select">
                    <option value="off">Off - show the normal title</option>
                    <option value="on">On - show introduction button on main screen</option>
                </select>
                <div id="introductionSettingsPanel" class="introduction-settings-panel" hidden>
                    <p class="settings-help">Set the introduction shown and spoken from the main screen header.</p>
                    <label for="settingsIntroductionText">Introduction text</label>
                    <textarea id="settingsIntroductionText" class="settings-textarea" maxlength="500" placeholder="Hello, my name is... Please give me time."></textarea>
                    <label for="settingsIntroductionIcon">Default icon if no picture is chosen</label>
                    <div class="introduction-inline-actions">
                        <input id="settingsIntroductionIcon" class="settings-icon-input" maxlength="4" value="👋">
                        <button type="button" class="management-btn small-management-btn" data-intro-icon-menu>Choose icon</button>
                    </div>
                    <div class="introduction-inline-actions introduction-media-actions">
                        <button type="button" class="management-btn small-management-btn" data-intro-image-options>Picture</button>
                        <button type="button" class="management-btn small-management-btn" data-intro-record>Record / re-record audio</button>
                        <button type="button" class="management-btn small-management-btn" data-intro-play>Play audio</button>
                        <button type="button" class="management-btn remove-btn small-management-btn" data-intro-delete-audio>Delete audio</button>
                    </div>
                    <div class="introduction-save-row">
                        <button type="button" class="management-btn close-btn" data-intro-cancel>Cancel</button>
                        <button type="button" class="management-btn" data-intro-save>Save introduction</button>
                    </div>
                </div>
                <label for="settingsAutoUpdateCheck">Automatic update check</label>
                <select id="settingsAutoUpdateCheck" class="settings-select">
                    <option value="off">Off - update manually</option>
                    <option value="on">On - check the website for a newer app</option>
                </select>
                <p class="settings-help">Checks for newer MyNewVoice app files from the website. Saved phrases, pictures, and voice recordings are kept.</p>
            </div>
            <div class="settings-dashboard" aria-label="Settings dashboard">
                <section class="settings-group settings-group-display">
                    <h4>Display and interaction</h4>
                    <div class="settings-actions settings-actions-compact">
                        <button type="button" class="settings-action-btn" data-check-app-update><span class="settings-card-icon" aria-hidden="true">↻</span><span class="settings-card-text"><strong>Check for updates</strong><small>Look for a newer website version.</small></span><span class="settings-card-chevron" aria-hidden="true">›</span></button>
                        <button type="button" class="settings-action-btn" data-refresh-app-code><span class="settings-card-icon" aria-hidden="true">⟳</span><span class="settings-card-text"><strong>Refresh app code</strong><small>Reload app files while keeping saved content.</small></span><span class="settings-card-chevron" aria-hidden="true">›</span></button>
                    </div>
                </section>
                <section class="settings-group settings-group-edit">
                    <h4>Edit content</h4>
                    <div class="settings-actions settings-actions-compact">
                        <button type="button" class="settings-action-btn settings-action-prominent" data-open-management><span class="settings-card-icon" aria-hidden="true">✎</span><span class="settings-card-text"><strong>Edit menus, phrases, pictures and voices</strong><small>Manage the words, images and recordings.</small></span><span class="settings-card-chevron" aria-hidden="true">›</span></button>
                    </div>
                </section>
                <section class="settings-group settings-group-backup">
                    <h4>Backup and restore</h4>
                    <div class="settings-actions settings-actions-compact">
                        <button type="button" class="settings-action-btn" data-export-full-backup><span class="settings-card-icon" aria-hidden="true">⇩</span><span class="settings-card-text"><strong>Export complete backup</strong><small>Save phrases, pictures and recordings.</small></span><span class="settings-card-chevron" aria-hidden="true">›</span></button>
                        <button type="button" class="settings-action-btn" data-import-full-backup><span class="settings-card-icon" aria-hidden="true">⇧</span><span class="settings-card-text"><strong>Import complete backup</strong><small>Load a saved MyNewVoice backup.</small></span><span class="settings-card-chevron" aria-hidden="true">›</span></button>
                        <input type="file" id="fullBackupImportFile" accept=".mnvoice,.json,application/json" hidden>
                    </div>
                </section>
                <section class="settings-group settings-group-danger">
                    <h4>Danger zone</h4>
                    <p class="settings-group-note">These actions permanently remove local content unless you have exported a complete backup first.</p>
                    <div class="settings-actions settings-actions-compact">
                        <button type="button" class="settings-action-btn danger-settings-btn" data-clear-all-images><span class="settings-card-icon" aria-hidden="true">⌧</span><span class="settings-card-text"><strong>Remove all images</strong><small>Delete local saved pictures only.</small></span><span class="settings-card-chevron" aria-hidden="true">›</span></button>
                        <button type="button" class="settings-action-btn danger-settings-btn" data-clear-all-audio><span class="settings-card-icon" aria-hidden="true">⌧</span><span class="settings-card-text"><strong>Remove all audio</strong><small>Delete local recorded voices only.</small></span><span class="settings-card-chevron" aria-hidden="true">›</span></button>
                    </div>
                </section>
                <section class="settings-group settings-group-about">
                    <h4>About and exit</h4>
                    <div class="settings-actions settings-actions-compact">
                        <button type="button" class="settings-action-btn" data-open-about><span class="settings-card-icon" aria-hidden="true">i</span><span class="settings-card-text"><strong>About MyNewVoice</strong><small>Copyright and project information.</small></span><span class="settings-card-chevron" aria-hidden="true">›</span></button>
                        <button type="button" class="settings-action-btn return-app-settings-btn" data-settings-close><span class="settings-card-icon" aria-hidden="true">↩</span><span class="settings-card-text"><strong>Return to App</strong><small>Close Settings and go back.</small></span><span class="settings-card-chevron" aria-hidden="true">›</span></button>
                    </div>
                </section>
            </div>
            <p class="settings-note">Complete backup preserves content, local photos, and recorded voices together.</p>
        </div>
    `;

    overlay.addEventListener('click', (event) => {
        if (event.target.closest('[data-settings-close]')) hideSettingsOverlay();
        if (event.target.closest('[data-open-management]')) {
            hideSettingsOverlay();
            contentEditorScreen = 'topics';
            showManagementPanel();
            return;
        }
        if (event.target.closest('[data-export-full-backup]')) {
            exportFullAppBackup();
            return;
        }
        if (event.target.closest('[data-import-full-backup]')) {
            const input = document.getElementById('fullBackupImportFile');
            if (input) input.click();
            return;
        }
        if (event.target.closest('[data-clear-all-images]')) {
            confirmAndClearAllImages();
            return;
        }
        if (event.target.closest('[data-clear-all-audio]')) {
            confirmAndClearAllAudio();
            return;
        }
        if (event.target.closest('[data-check-app-update]')) {
            checkForAppUpdate({ manual: true });
            return;
        }
        if (event.target.closest('[data-refresh-app-code]')) {
            refreshAppCodeSafely();
            return;
        }
        if (event.target.closest('[data-intro-image-options]')) {
            showIntroductionImageOptions();
            return;
        }
        if (event.target.closest('[data-intro-record]')) {
            const textField = document.getElementById('settingsIntroductionText');
            toggleVoiceRecording(INTRODUCTION_VOICE_KEY, textField ? textField.value : getIntroductionSettings().text, event.target.closest('[data-intro-record]'));
            return;
        }
        if (event.target.closest('[data-intro-play]')) {
            playIntroductionFromSettings();
            return;
        }
        if (event.target.closest('[data-intro-delete-audio]')) {
            deletePrivateMediaFromSetup(INTRODUCTION_VOICE_KEY);
            return;
        }
        if (event.target.closest('[data-intro-icon-menu]')) {
            showFallbackIconMenu('introduction', INTRODUCTION_ITEM_ID, '');
            return;
        }
        if (event.target.closest('[data-intro-save]')) {
            saveIntroductionSettingsFromPanel();
            return;
        }
        if (event.target.closest('[data-intro-cancel]')) {
            updateSettingsControls();
            showToast('Introduction changes cancelled', 'warning');
            return;
        }
        if (event.target.closest('[data-open-about]')) {
            hideSettingsOverlay();
            const aboutModal = document.getElementById('aboutModal');
            if (aboutModal) aboutModal.style.display = 'flex';
        }
    });

    overlay.addEventListener('change', (event) => {
        if (event.target && event.target.id === 'settingsDisplayMode') {
            appSettings.displayMode = event.target.value;
            saveAppSettings();
            showToast(appSettings.displayMode === 'simple-list' ? 'Simple vocabulary list enabled' : 'Menu view enabled', 'success');
            return;
        }
        if (event.target && event.target.id === 'settingsPressActivation') {
            appSettings.pressActivation = event.target.value;
            saveAppSettings({ render: false });
            showToast(appSettings.pressActivation === 'normal' ? 'Normal tap enabled' : 'Long press setting saved', 'success');
            return;
        }
        if (event.target && event.target.id === 'settingsIntroductionEnabled') {
            updateIntroductionSettingsPanelVisibility();
            return;
        }
        if (event.target && event.target.id === 'settingsAutoUpdateCheck') {
            appSettings.autoUpdateCheck = event.target.value === 'on';
            saveAppSettings({ render: false });
            showToast(appSettings.autoUpdateCheck ? 'Automatic update check on' : 'Automatic update check off', 'success');
            if (appSettings.autoUpdateCheck) checkForAppUpdate({ manual: false });
            return;
        }
        if (event.target && event.target.id === 'fullBackupImportFile') {
            importFullAppBackup(event.target.files && event.target.files[0]);
            event.target.value = '';
        }
    });

    overlay.addEventListener('input', (event) => {
        if (event.target && event.target.id === 'settingsPopupCloseDelay') {
            appSettings.popupCloseDelaySeconds = clampNumber(Number(event.target.value), 1, 5);
            saveAppSettings({ render: false });
            updateSettingsControls();
            return;
        }
    });

    document.body.appendChild(overlay);
    return overlay;
}

function showSettingsOverlay() {
    const overlay = ensureSettingsOverlay();
    updateSettingsControls();
    overlay.style.display = 'flex';
    requestAnimationFrame(() => overlay.classList.add('show'));
}

function hideSettingsOverlay() {
    const overlay = document.getElementById('settingsOverlay');
    if (!overlay) return;
    overlay.classList.remove('show');
    overlay.style.display = 'none';
}

async function refreshAppCodeSafely() {
    const confirmed = confirm(
        'Refresh app code now?\n\n' +
        'This updates the app files on this device but keeps locally saved photos and recorded voices.\n\n' +
        'For safety, export a private backup after adding important photos or recordings.'
    );
    if (!confirmed) return;
    await performSafeAppCodeRefresh('Refreshing app files… local photos and voices will be kept.');
}

async function performSafeAppCodeRefresh(message = 'Refreshing app files… local photos and voices will be kept.') {
    hideSettingsOverlay();
    showToast(message, 'info');

    try {
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames
                .filter(name => name.toLowerCase().includes('mynewvoice'))
                .map(name => caches.delete(name))
            );
        }

        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map(async registration => {
                try {
                    await registration.update();
                    if (registration.waiting) registration.waiting.postMessage('skipWaiting');
                    if (registration.installing) registration.installing.postMessage('skipWaiting');
                } catch (error) {
                    console.warn('Service worker update failed:', error);
                }
            }));
        }
    } catch (error) {
        console.warn('Safe app refresh had a non-fatal error:', error);
    }

    const url = new URL(window.location.href);
    url.searchParams.set('refresh', Date.now().toString());
    window.location.replace(url.toString());
}

async function fetchWebsiteAppVersion() {
    const response = await fetch(`./app-version.json?check=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Accept': 'application/json' }
    });
    if (!response.ok) throw new Error(`Version check failed (${response.status})`);
    const data = await response.json();
    return data && typeof data === 'object' ? data : null;
}

function isDifferentWebsiteVersion(versionInfo) {
    const websiteVersion = String(versionInfo?.appVersion || '').trim();
    return Boolean(websiteVersion && websiteVersion !== CURRENT_APP_VERSION);
}

async function checkForAppUpdate({ manual = false } = {}) {
    try {
        const versionInfo = await fetchWebsiteAppVersion();
        const websiteVersion = String(versionInfo?.appVersion || '').trim();
        if (!websiteVersion) {
            if (manual) showToast('Could not read website version information', 'warning');
            return false;
        }

        if (!isDifferentWebsiteVersion(versionInfo)) {
            if (manual) showToast(`This device is already running ${CURRENT_APP_VERSION}`, 'success');
            return false;
        }

        const updateNow = confirm(
            `A newer MyNewVoice app version is available from the website.\n\n` +
            `This device: ${CURRENT_APP_VERSION}\n` +
            `Website: ${websiteVersion}\n\n` +
            `Update app files now?\n\n` +
            `Saved phrases, pictures, recorded voices, and imported backup content will be kept.`
        );
        if (updateNow) {
            await performSafeAppCodeRefresh(`Updating MyNewVoice to ${websiteVersion}… saved content will be kept.`);
        } else if (manual) {
            showToast('Update skipped', 'warning');
        }
        return true;
    } catch (error) {
        console.warn('App update check failed:', error);
        if (manual) showToast('Could not check for updates', 'error');
        return false;
    }
}


function ensurePrivateSetupOverlay() {
    let overlay = document.getElementById('privateSetupOverlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'privateSetupOverlay';
    overlay.className = 'private-setup-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'privateSetupTitle');
    overlay.innerHTML = `
        <div class="private-setup-panel">
            <div class="private-setup-header">
                <h3 id="privateSetupTitle">Photo / Voice Setup</h3>
                <button type="button" class="settings-close" data-private-setup-close aria-label="Close photo and voice setup">×</button>
            </div>
            <p class="private-setup-intro">Choose private photos and record phrase voices on this device. These files stay local and are not uploaded to GitHub. Use Settings → Export complete backup to preserve menu edits, photos, and recordings together.</p>
            <div class="private-setup-tools">
                <button type="button" class="management-btn" data-request-persistent-storage>🛡️ Protect local storage</button>
                <button type="button" class="management-btn remove-btn" data-reset-private-media>🗑️ Clear local photos/voices</button>
                <input type="file" id="privateMediaImportFile" accept=".json,application/json" hidden>
            </div>
            <label class="private-category-picker">Choose section
                <select id="privateSetupCategorySelect" class="management-input"></select>
            </label>
            <div id="privateStorageStatus" class="private-storage-status" aria-live="polite"></div>
            <details class="private-section-details" open>
                <summary>Items in selected section</summary>
                <div id="privateSetupItemList" class="private-item-list"></div>
            </details>
            <div id="privateSelectedItemPanel" class="private-selected-panel"></div>
            <div class="private-setup-footer">
                <button type="button" class="management-btn save-private-setup" data-private-setup-save>✅ SAVE CHANGES</button>
            </div>
            <input type="file" id="privateImagePicker" accept="image/*" hidden>
        </div>
    `;

    overlay.addEventListener('click', handlePrivateSetupClick);
    overlay.addEventListener('change', handlePrivateSetupChange);
    document.body.appendChild(overlay);
    return overlay;
}

function showPrivateSetupOverlay() {
    const overlay = ensurePrivateSetupOverlay();
    populatePrivateSetupCategoryOptions();
    const select = document.getElementById('privateSetupCategorySelect');
    const category = select && select.value ? select.value : (getCategoryEntriesForSetup()[0] || 'quick');
    if (!privateSetupSelectedItem || privateSetupSelectedItem.category !== category) {
        privateSetupSelectedItem = { category, type: 'menu', phraseId: '' };
    }
    renderPrivateSetupContent();
    overlay.style.display = 'flex';
    requestAnimationFrame(() => overlay.classList.add('show'));
}

function hidePrivateSetupOverlay() {
    const overlay = document.getElementById('privateSetupOverlay');
    if (!overlay) return;
    overlay.classList.remove('show');
    overlay.style.display = 'none';
    stopActiveRecording(false);
}

function populatePrivateSetupCategoryOptions() {
    const select = document.getElementById('privateSetupCategorySelect');
    if (!select) return;

    const currentValue = select.value;
    select.innerHTML = '';

    getCategoryEntriesForSetup().forEach(category => {
        const meta = getCategoryMeta(category);
        const option = document.createElement('option');
        option.value = category;
        option.textContent = meta.label;
        select.appendChild(option);
    });

    if (currentValue && Array.from(select.options).some(option => option.value === currentValue)) {
        select.value = currentValue;
    }
}

function findPhraseById(category, phraseId) {
    return (buttonData[category] || []).find(item => item && item.id === phraseId) || null;
}

function selectPrivateSetupItem(category, type, phraseId = '') {
    privateSetupSelectedItem = { category, type, phraseId };
    renderPrivateSetupContent();
}

function renderPrivateSetupContent() {
    const select = document.getElementById('privateSetupCategorySelect');
    const itemList = document.getElementById('privateSetupItemList');
    const selectedPanel = document.getElementById('privateSelectedItemPanel');
    if (!select || !itemList || !selectedPanel) return;

    const category = select.value || getCategoryEntriesForSetup()[0] || 'quick';
    const meta = getCategoryMeta(category);
    const phrases = buttonData[category] || [];

    if (!privateSetupSelectedItem || privateSetupSelectedItem.category !== category) {
        privateSetupSelectedItem = { category, type: 'menu', phraseId: '' };
    }

    const selectedPhrase = privateSetupSelectedItem.type === 'phrase' ? findPhraseById(category, privateSetupSelectedItem.phraseId) : null;
    if (privateSetupSelectedItem.type === 'phrase' && !selectedPhrase) {
        privateSetupSelectedItem = { category, type: 'menu', phraseId: '' };
    }

    const menuActive = privateSetupSelectedItem.type === 'menu';
    itemList.innerHTML = `
        <button type="button" class="private-item-button ${menuActive ? 'active' : ''}" data-select-private-item data-item-type="menu" data-category="${escapeHtml(category)}">
            <span>Top menu image</span>
            <small>${escapeHtml(getMenuImagePath(category))}</small>
        </button>
        ${phrases.map((phrase, index) => {
            const isActive = privateSetupSelectedItem.type === 'phrase' && privateSetupSelectedItem.phraseId === phrase.id;
            const label = phrase.text || `Phrase ${index + 1}`;
            return `
                <button type="button" class="private-item-button ${isActive ? 'active' : ''}" data-select-private-item data-item-type="phrase" data-category="${escapeHtml(category)}" data-phrase-id="${escapeHtml(phrase.id || '')}">
                    <span>${escapeHtml(label)}</span>
                    <small>${escapeHtml(getPhraseFilenameForSetup(category, phrase))}</small>
                </button>
            `;
        }).join('') || '<p>No phrases in this section.</p>'}
    `;

    if (privateSetupSelectedItem.type === 'menu') {
        const menuKey = getPrivateMediaKey('menu', category);
        selectedPanel.innerHTML = `
            <h4>${escapeHtml(meta.label)} main menu picture</h4>
            <p class="private-selected-help">Choose or take a picture for this large main menu button. It will appear on the section card before Dad enters the phrases.</p>
            <code>${escapeHtml(getMenuImagePath(category))}</code>
            <span class="private-media-status" data-status-key="${escapeHtml(menuKey)}">Image: checking...</span>
            <div class="private-control-groups">
                <div class="private-control-group">
                    <h5>Main menu button picture</h5>
                    <button type="button" class="management-btn" data-pick-image data-key="${escapeHtml(menuKey)}" data-label="${escapeHtml(meta.label)} main menu button picture">Choose / take picture for main menu button</button>
                    <button type="button" class="management-btn remove-btn" data-delete-media data-key="${escapeHtml(menuKey)}">Remove main menu picture</button>
                </div>
            </div>
        `;
    } else {
        const phrase = findPhraseById(category, privateSetupSelectedItem.phraseId);
        const phraseKey = getPrivateMediaKey('phrase', phrase);
        const voiceKey = getPrivateMediaKey('voice', phrase);
        const safeText = escapeHtml(phrase.text || 'Selected phrase');
        const isPeople = category === 'MyPeople' || /^people/i.test(String(phrase.id || ''));
        selectedPanel.innerHTML = `
            <h4>${safeText}</h4>
            <p class="private-selected-help">${isPeople ? 'Choose or take a person photo. It will be cropped as a circle.' : 'Choose or take one picture for this phrase. It will be cropped as a square.'} The same picture appears beside the phrase and in the popup after the phrase is spoken.</p>
            <code>${escapeHtml(getPhraseFilenameForSetup(category, phrase))}</code>
            <span class="private-media-status" data-status-key="${escapeHtml(phraseKey)}">Photo: checking...</span>
            <span class="private-media-status" data-status-key="${escapeHtml(voiceKey)}">Voice: checking...</span>
            <div class="private-control-groups">
                <div class="private-control-group">
                    <h5>${isPeople ? 'Person photo' : 'Phrase picture'}</h5>
                    <button type="button" class="management-btn" data-pick-image data-key="${escapeHtml(phraseKey)}" data-label="${safeText} phrase picture" data-text="${safeText}">Choose / take picture for this phrase</button>
                    <button type="button" class="management-btn remove-btn" data-delete-media data-key="${escapeHtml(phraseKey)}">Remove phrase picture</button>
                </div>
                <div class="private-control-group">
                    <h5>Recorded voice</h5>
                    <button type="button" class="management-btn" data-record-voice data-key="${escapeHtml(voiceKey)}" data-text="${safeText}">🎙️ Record</button>
                    <button type="button" class="management-btn" data-play-voice data-key="${escapeHtml(voiceKey)}">▶️ Play</button>
                    <button type="button" class="management-btn remove-btn" data-delete-media data-key="${escapeHtml(voiceKey)}">Delete voice</button>
                </div>
            </div>
        `;
    }

    refreshPrivateMediaStatuses();
}

async function refreshPrivateMediaStatuses() {
    const statusElements = document.querySelectorAll('.private-media-status[data-status-key]');
    for (const status of statusElements) {
        const key = status.dataset.statusKey;
        const record = await getPrivateMediaRecord(key);
        const kind = key.split(':')[0];
        const label = kind === 'voice' ? 'Voice' : kind === 'menu' ? 'Menu image' : 'Photo';
        if (record && record.blob) {
            const sizeKb = Math.max(1, Math.round(record.blob.size / 1024));
            status.textContent = `${label}: saved locally (${sizeKb} KB)`;
            status.classList.add('saved');
        } else {
            status.textContent = `${label}: not set`;
            status.classList.remove('saved');
        }
    }

    const storageStatus = document.getElementById('privateStorageStatus');
    if (storageStatus && navigator.storage && navigator.storage.persisted) {
        try {
            const persisted = await navigator.storage.persisted();
            storageStatus.textContent = persisted ? 'Local storage protection: enabled on this browser.' : 'Local storage protection: not confirmed. Use Export private backup after setup.';
            storageStatus.classList.toggle('saved', persisted);
        } catch (_) {
            storageStatus.textContent = 'Local storage status unavailable. Use Export private backup after setup.';
        }
    }
}

function handlePrivateSetupClick(event) {
    const target = event.target;

    if (target === event.currentTarget || target.closest('[data-private-setup-close]')) {
        hidePrivateSetupOverlay();
        return;
    }

    const selectItemButton = target.closest('[data-select-private-item]');
    if (selectItemButton) {
        selectPrivateSetupItem(selectItemButton.dataset.category, selectItemButton.dataset.itemType, selectItemButton.dataset.phraseId || '');
        return;
    }

    if (target.closest('[data-private-setup-save]')) {
        hidePrivateSetupOverlay();
        showMainMenu();
        showToast('Photo / Voice Setup saved', 'success');
        return;
    }

    const pickImageButton = target.closest('[data-pick-image]');
    if (pickImageButton) {
        choosePrivateImage(pickImageButton.dataset.key, pickImageButton.dataset.label, pickImageButton.dataset.text || '');
        return;
    }

    const deleteButton = target.closest('[data-delete-media]');
    if (deleteButton) {
        deletePrivateMediaFromSetup(deleteButton.dataset.key);
        return;
    }

    const recordButton = target.closest('[data-record-voice]');
    if (recordButton) {
        toggleVoiceRecording(recordButton.dataset.key, recordButton.dataset.text || '', recordButton);
        return;
    }

    const playButton = target.closest('[data-play-voice]');
    if (playButton) {
        playSetupVoice(playButton.dataset.key);
        return;
    }

    if (target.closest('[data-request-persistent-storage]')) {
        requestPersistentPrivateStorage();
        return;
    }

    if (target.closest('[data-export-private-media]')) {
        exportPrivateMediaBackup();
        return;
    }

    if (target.closest('[data-import-private-media]')) {
        const input = document.getElementById('privateMediaImportFile');
        if (input) input.click();
        return;
    }

    if (target.closest('[data-reset-private-media]')) {
        resetPrivateMediaStorage();
    }
}

function handlePrivateSetupChange(event) {
    if (event.target && event.target.id === 'privateSetupCategorySelect') {
        privateSetupSelectedItem = { category: event.target.value, type: 'menu', phraseId: '' };
        renderPrivateSetupContent();
    }

    if (event.target && event.target.id === 'privateMediaImportFile') {
        importPrivateMediaBackup(event.target.files && event.target.files[0]);
        event.target.value = '';
    }
}

async function choosePrivateImage(key, label = '', text = '') {
    let input = document.getElementById('privateImagePicker');
    if (!input) {
        input = document.createElement('input');
        input.type = 'file';
        input.id = 'privateImagePicker';
        input.accept = 'image/*';
        input.removeAttribute('capture');
        input.hidden = true;
        document.body.appendChild(input);
    }
    if (!key) return;

    input.onchange = async (event) => {
        const file = event.target.files && event.target.files[0];
        event.target.value = '';
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            showToast('Please choose an image file.', 'error');
            return;
        }

        try {
            const cropConfig = getCropConfigForKey(key);
            const downsizedForCrop = await resizeImageFile(file, 1800, 0.86);
            const croppedBlob = await openImageCropper(downsizedForCrop, {
                label: label || cropConfig.label,
                aspect: cropConfig.aspect,
                shape: cropConfig.shape,
                outputWidth: cropConfig.width,
                outputHeight: cropConfig.height
            });
            const blob = cropConfig.shape === 'circle' ? croppedBlob : await resizeImageFile(croppedBlob, PRIVATE_IMAGE_MAX_SIZE, PRIVATE_IMAGE_JPEG_QUALITY);
            await putPrivateMediaRecord(key, 'image', blob, { label, text, mime: blob.type || file.type });
            showToast('📷 Cropped photo saved locally on this device', 'success');
            refreshAfterPrivateMediaChange();
        } catch (error) {
            if (error && /cancelled/i.test(error.message || '')) return;
            console.error(error);
            showToast('Could not crop or save photo locally', 'error');
        }
    };

    input.click();
}


function ensureManagementImageOptionsOverlay() {
    let overlay = document.getElementById('managementImageOptionsOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'managementImageOptionsOverlay';
    overlay.className = 'image-options-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `
        <div class="image-options-panel">
            <div class="settings-header">
                <h3>Picture options</h3>
                <button type="button" class="settings-close" data-image-options-cancel aria-label="Cancel picture options">×</button>
            </div>
            <p class="settings-note" id="managementImageOptionsText">Choose what to do with this picture box.</p>
            <div class="settings-actions settings-actions-compact">
                <button type="button" class="settings-action-btn" data-image-options-edit>✂️ Edit / re-crop current picture</button>
                <button type="button" class="settings-action-btn" data-image-options-load>📷 Load or take new picture</button>
                <button type="button" class="settings-action-btn" data-image-options-icon>⭐ Choose fallback icon</button>
                <button type="button" class="settings-action-btn danger-settings-btn" data-image-options-delete>🗑️ Delete picture</button>
                <button type="button" class="settings-action-btn" data-image-options-cancel>Cancel</button>
            </div>
        </div>
    `;
    overlay.addEventListener('click', async (event) => {
        const state = window.__mnvImageOptions;
        if (!state) return;
        if (event.target.closest('[data-image-options-cancel]')) {
            overlay.classList.remove('show');
            overlay.style.display = 'none';
            window.__mnvImageOptions = null;
            return;
        }
        if (event.target.closest('[data-image-options-load]')) {
            overlay.classList.remove('show');
            overlay.style.display = 'none';
            choosePrivateImage(state.key, state.label, state.text);
            window.__mnvImageOptions = null;
            return;
        }
        if (event.target.closest('[data-image-options-edit]')) {
            const record = await getPrivateMediaRecord(state.key);
            if (!record || !record.blob) {
                showToast('No picture is saved in this box yet.', 'warning');
                return;
            }
            overlay.classList.remove('show');
            overlay.style.display = 'none';
            try {
                const cropConfig = getCropConfigForKey(state.key);
                const croppedBlob = await openImageCropper(record.blob, {
                    label: state.label || cropConfig.label,
                    aspect: cropConfig.aspect,
                    shape: cropConfig.shape,
                    outputWidth: cropConfig.width,
                    outputHeight: cropConfig.height
                });
                const finalBlob = cropConfig.shape === 'circle' ? croppedBlob : await resizeImageFile(croppedBlob, PRIVATE_IMAGE_MAX_SIZE, PRIVATE_IMAGE_JPEG_QUALITY);
                await putPrivateMediaRecord(state.key, 'image', finalBlob, { label: state.label, text: state.text, mime: finalBlob.type || record.mime || 'image/jpeg' });
                showToast('Picture updated', 'success');
                refreshAfterPrivateMediaChange();
            } catch (error) {
                if (error && /cancelled/i.test(error.message || '')) return;
                console.error(error);
                showToast('Could not edit picture', 'error');
            }
            window.__mnvImageOptions = null;
            return;
        }
        if (event.target.closest('[data-image-options-delete]')) {
            if (!confirm('Delete this saved picture from this device?')) return;
            await deletePrivateMediaRecord(state.key);
            overlay.classList.remove('show');
            overlay.style.display = 'none';
            window.__mnvImageOptions = null;
            showToast('Picture deleted', 'success');
            refreshAfterPrivateMediaChange();
            return;
        }
        if (event.target.closest('[data-image-options-icon]')) {
            overlay.classList.remove('show');
            overlay.style.display = 'none';
            showFallbackIconMenu(state.kind, state.id, state.category || contentSetupPhraseCategory);
            window.__mnvImageOptions = null;
        }
    });
    document.body.appendChild(overlay);
    return overlay;
}

async function showManagementImageOptions(kind, id, category = '') {
    const key = getPrivateMediaKey(kind, kind === 'menu' ? id : { id });
    const record = await getPrivateMediaRecord(key);
    const overlay = ensureManagementImageOptionsOverlay();
    const textEl = overlay.querySelector('#managementImageOptionsText');
    const editBtn = overlay.querySelector('[data-image-options-edit]');
    const deleteBtn = overlay.querySelector('[data-image-options-delete]');
    const label = kind === 'menu' ? `${getCategoryMeta(id).label} main menu button picture` : `${(findPhraseById(category || contentSetupPhraseCategory, id) || {}).text || id} phrase picture`;
    const phraseText = kind === 'menu' ? '' : ((findPhraseById(category || contentSetupPhraseCategory, id) || {}).text || '');
    window.__mnvImageOptions = { kind, id, category, key, label, text: phraseText };
    if (textEl) textEl.textContent = record ? 'This picture box already has a saved picture. You can crop it again, replace it, delete it, or choose a fallback icon.' : 'This picture box does not yet have a saved picture. You can load/take a picture or choose a fallback icon.';
    if (editBtn) editBtn.disabled = !record;
    if (deleteBtn) deleteBtn.disabled = !record;
    overlay.style.display = 'flex';
    void overlay.offsetWidth;
    overlay.classList.add('show');
}

function ensureFallbackIconOverlay() {
    let overlay = document.getElementById('fallbackIconOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'fallbackIconOverlay';
    overlay.className = 'image-options-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    const icons = ['✅','❌','❔','🛑','✋','💧','🥤','🍽️','☕','🧼','🚽','👓','👂','❤️','😊','😔','😴','💬','📞','👨‍👩‍👧‍👦','🕒','🎵','📺','🚶','📷','🛋️','🏠','📝','⭐','❓'];
    overlay.innerHTML = `
        <div class="image-options-panel icon-options-panel">
            <div class="settings-header">
                <h3>Choose fallback icon</h3>
                <button type="button" class="settings-close" data-icon-cancel aria-label="Cancel icon choice">×</button>
            </div>
            <p class="settings-note">This icon is shown when no photo is saved for the item.</p>
            <div class="fallback-icon-grid">${icons.map(icon => `<button type="button" class="fallback-icon-choice" data-icon-choice="${icon}">${icon}</button>`).join('')}</div>
            <div class="private-setup-footer"><button type="button" class="management-btn" data-icon-cancel>Cancel</button></div>
        </div>
    `;
    overlay.addEventListener('click', (event) => {
        if (event.target.closest('[data-icon-cancel]')) {
            overlay.classList.remove('show'); overlay.style.display = 'none'; window.__mnvIconTarget = null; return;
        }
        const choice = event.target.closest('[data-icon-choice]');
        if (!choice || !window.__mnvIconTarget) return;
        const icon = choice.dataset.iconChoice;
        const target = window.__mnvIconTarget;
        if (target.kind === 'menu') {
            categoryConfig.categories[target.id] = categoryConfig.categories[target.id] || {};
            categoryConfig.categories[target.id].icon = icon;
            saveCategoryConfig();
            saveDataToStorage();
            renderCategoryMenuCards();
        } else if (target.kind === 'introduction') {
            const iconField = document.getElementById('settingsIntroductionIcon');
            if (iconField) iconField.value = icon;
        } else {
            const phrase = findPhraseById(target.category || contentSetupPhraseCategory, target.id);
            if (phrase) {
                phrase.icon = icon;
                saveDataToStorage();
                if (currentViewCategory === (target.category || contentSetupPhraseCategory)) populateGrid(target.category || contentSetupPhraseCategory);
            }
        }
        overlay.classList.remove('show'); overlay.style.display = 'none'; window.__mnvIconTarget = null;
        renderContentManagementPanel();
        showToast('Fallback icon saved', 'success');
    });
    document.body.appendChild(overlay);
    return overlay;
}

function showFallbackIconMenu(kind, id, category = '') {
    window.__mnvIconTarget = { kind, id, category };
    const overlay = ensureFallbackIconOverlay();
    overlay.style.display = 'flex';
    void overlay.offsetWidth;
    overlay.classList.add('show');
}

async function deletePrivateMediaFromSetup(key) {
    if (!key) return;
    if (!confirm('Remove this local private item from this device?')) return;

    await deletePrivateMediaRecord(key);
    showToast('Local item removed', 'success');
    refreshAfterPrivateMediaChange();
}

async function refreshAfterPrivateMediaChange() {
    await refreshPrivateVoiceKeyIndex();
    renderCategoryMenuCards();
    if (!currentViewCategory) renderIntroductionHeaderButton();
    const grid = document.getElementById('buttonGrid');
    if (grid && !grid.hidden && grid.dataset.category) populateGrid(grid.dataset.category);

    // v26: the old Photo / Voice Setup overlay is retained only as a dormant compatibility path.
    // Avoid refreshing its DOM unless it is actually visible, so the current editor remains the primary UI.
    const privateSetupOverlay = document.getElementById('privateSetupOverlay');
    if (privateSetupOverlay && privateSetupOverlay.classList.contains('show')) renderPrivateSetupContent();

    const managementOverlay = document.getElementById('managementOverlay');
    if (managementOverlay && managementOverlay.classList.contains('show')) renderContentManagementPanel();
}

async function requestPersistentPrivateStorage() {
    if (!navigator.storage || !navigator.storage.persist) {
        showToast('Storage protection is not available in this browser. Use backup export.', 'warning');
        return;
    }

    try {
        const granted = await navigator.storage.persist();
        showToast(granted ? '🛡️ Local storage protection enabled' : 'Storage protection was not granted. Use backup export.', granted ? 'success' : 'warning');
        refreshPrivateMediaStatuses();
    } catch (error) {
        console.warn(error);
        showToast('Could not request storage protection. Use backup export.', 'warning');
    }
}

async function toggleVoiceRecording(key, text, button) {
    if (!key) return;

    if (activeRecorder && activeRecordingKey === key) {
        stopActiveRecording(true);
        return;
    }

    if (activeRecorder) {
        showToast('Stop the current recording first.', 'warning');
        return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
        showToast('Voice recording is not available in this browser.', 'error');
        return;
    }

    try {
        activeRecorderStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/mpeg'].find(type => {
            try { return MediaRecorder.isTypeSupported(type); } catch (_) { return false; }
        });
        activeRecorder = mimeType ? new MediaRecorder(activeRecorderStream, { mimeType }) : new MediaRecorder(activeRecorderStream);
        activeRecorderChunks = [];
        activeRecordingKey = key;
        activeRecordingButton = button;

        activeRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) activeRecorderChunks.push(event.data);
        };

        activeRecorder.onstop = async () => {
            const finalMime = activeRecorder.mimeType || 'audio/webm';
            const blob = new Blob(activeRecorderChunks, { type: finalMime });
            try {
                await putPrivateMediaRecord(key, 'voice', blob, { text, label: text, mime: finalMime });
                showToast('🎙️ Voice recording saved locally', 'success');
            } catch (error) {
                console.error(error);
                showToast('Could not save recording', 'error');
            }
            cleanupRecorderState();
            await refreshAfterPrivateMediaChange();
        };

        activeRecorder.start();
        if (button) {
            button.textContent = '⏹️ Stop';
            button.classList.add('recording');
        }
        showToast('Recording... tap Stop when finished', 'info');
    } catch (error) {
        console.error(error);
        cleanupRecorderState();
        showToast('Microphone permission was not granted or recording failed.', 'error');
    }
}

function stopActiveRecording(saveRecording = true) {
    if (!activeRecorder) return;

    try {
        if (activeRecorder.state !== 'inactive') {
            activeRecorder.stop();
        }
    } catch (error) {
        console.warn(error);
    }

    if (!saveRecording) cleanupRecorderState();
}

function cleanupRecorderState() {
    if (activeRecorderStream) {
        activeRecorderStream.getTracks().forEach(track => track.stop());
    }
    if (activeRecordingButton) {
        activeRecordingButton.textContent = '🎙️ Record';
        activeRecordingButton.classList.remove('recording');
    }
    activeRecorder = null;
    activeRecorderChunks = [];
    activeRecorderStream = null;
    activeRecordingKey = null;
    activeRecordingButton = null;
}

async function playSetupVoice(key) {
    const record = await getPrivateMediaRecord(key);
    if (!record || !record.blob) {
        showToast('No recorded voice saved for this phrase.', 'warning');
        return;
    }

    const url = URL.createObjectURL(record.blob);
    const audio = new Audio(url);
    audio.onended = () => URL.revokeObjectURL(url);
    audio.onerror = () => URL.revokeObjectURL(url);
    audio.play().catch(error => {
        console.warn(error);
        URL.revokeObjectURL(url);
        showToast('Could not play recording.', 'error');
    });
}

async function exportPrivateMediaBackup() {
    const records = await getAllPrivateMediaRecords();
    if (!records.length) {
        showToast('No private photos or voices to export.', 'warning');
        return;
    }

    try {
        const exportRecords = [];
        for (const record of records) {
            exportRecords.push({
                id: record.id,
                type: record.type,
                mime: record.mime,
                label: record.label || '',
                text: record.text || '',
                updatedAt: record.updatedAt,
                dataUrl: await readBlobAsDataUrl(record.blob)
            });
        }

        const payload = {
            type: PRIVATE_MEDIA_BACKUP_TYPE,
            version: 1,
            exportedAt: new Date().toISOString(),
            records: exportRecords
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `mynewvoice_private_media_backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        showToast('Private photo/voice backup exported', 'success');
    } catch (error) {
        console.error(error);
        showToast('Private backup export failed', 'error');
    }
}

async function importPrivateMediaBackup(file) {
    if (!file) return;

    try {
        const text = await file.text();
        const payload = JSON.parse(text);
        if (payload.type !== PRIVATE_MEDIA_BACKUP_TYPE || !Array.isArray(payload.records)) {
            showToast('This is not a MyNewVoice private media backup.', 'error');
            return;
        }

        if (!confirm(`Import ${payload.records.length} private media items onto this device?`)) return;

        for (const record of payload.records) {
            const blob = await dataUrlToBlob(record.dataUrl);
            await putPrivateMediaRecord(record.id, record.type, blob, {
                label: record.label || '',
                text: record.text || '',
                mime: record.mime || blob.type
            });
        }

        showToast('Private photos/voices imported', 'success');
        refreshAfterPrivateMediaChange();
    } catch (error) {
        console.error(error);
        showToast('Private backup import failed', 'error');
    }
}


async function buildCompleteBackupPayload() {
    const records = await getAllPrivateMediaRecords();
    const exportRecords = [];
    for (const record of records) {
        exportRecords.push({
            id: record.id,
            type: record.type,
            mime: record.mime,
            label: record.label || '',
            text: record.text || '',
            updatedAt: record.updatedAt,
            dataUrl: await readBlobAsDataUrl(record.blob)
        });
    }

    return {
        type: FULL_APP_BACKUP_TYPE,
        version: 1,
        exportedAt: new Date().toISOString(),
        appVersion: CURRENT_APP_VERSION,
        buttonData,
        appSettings: normaliseAppSettings(appSettings),
        categoryConfig: normaliseCategoryConfig(categoryConfig),
        mediaRecords: exportRecords
    };
}

async function exportFullAppBackup() {
    try {
        const payload = await buildCompleteBackupPayload();
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `MyNewVoice_complete_backup_${new Date().toISOString().split('T')[0]}.mnvoice`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        showToast('Complete backup exported', 'success');
    } catch (error) {
        console.error(error);
        showToast('Complete backup export failed', 'error');
    }
}

async function importFullAppBackup(file) {
    if (!file) return;

    try {
        const text = await file.text();
        const payload = JSON.parse(text);
        if (payload.type !== FULL_APP_BACKUP_TYPE || !payload.buttonData || !Array.isArray(payload.mediaRecords)) {
            showToast('This is not a MyNewVoice complete backup.', 'error');
            return;
        }

        if (!confirm('Import this complete backup?\n\nThis will replace current menu/phrase setup and restore saved photos and recordings on this device.')) return;

        buttonData = payload.buttonData;
        categoryConfig = normaliseCategoryConfig(payload.categoryConfig || categoryConfig);
        saveCategoryConfig();
        if (payload.appSettings) {
            appSettings = normaliseAppSettings(payload.appSettings);
            saveAppSettings({ render: false });
        }
        saveDataToStorage();

        await clearPrivateMediaRecords();
        for (const record of payload.mediaRecords) {
            const blob = await dataUrlToBlob(record.dataUrl);
            await putPrivateMediaRecord(record.id, record.type, blob, {
                label: record.label || '',
                text: record.text || '',
                mime: record.mime || blob.type
            });
        }

        await refreshPrivateVoiceKeyIndex();
        renderCategoryMenuCards();
        showMainMenu();
        showToast('Complete backup imported', 'success');
    } catch (error) {
        console.error(error);
        showToast('Complete backup import failed', 'error');
    }
}

async function resetPrivateMediaStorage() {
    if (!confirm('Clear all locally saved private photos and recorded voices on this device?')) return;
    await clearPrivateMediaRecords();
    showToast('Local private photos and voices cleared', 'success');
    refreshAfterPrivateMediaChange();
}

async function confirmAndClearAllImages() {
    const message = 'Remove ALL locally saved images from this device?\n\nThis removes main menu pictures and phrase pictures. Recorded voices and text/menu setup will be kept. This cannot be undone unless you have exported a complete backup.';
    if (!confirm(message)) return;

    const secondMessage = 'Final confirmation: remove all locally saved images now?';
    if (!confirm(secondMessage)) return;

    try {
        const removed = await clearPrivateMediaRecordsByType('image');
        showToast(`Removed ${removed} saved image${removed === 1 ? '' : 's'}`, 'success');
        refreshAfterPrivateMediaChange();
        renderCategoryMenuCards();
        if (currentViewCategory) renderSubmenu(currentViewCategory);
    } catch (error) {
        console.error(error);
        showToast('Could not remove saved images', 'error');
    }
}

async function confirmAndClearAllAudio() {
    const message = 'Remove ALL locally recorded voices from this device?\n\nPhotos, menu setup, and phrase text will be kept. Phrases without recordings will use the device-generated voice. This cannot be undone unless you have exported a complete backup.';
    if (!confirm(message)) return;

    const secondMessage = 'Final confirmation: remove all locally recorded voices now?';
    if (!confirm(secondMessage)) return;

    try {
        const removed = await clearPrivateMediaRecordsByType('voice');
        showToast(`Removed ${removed} saved voice recording${removed === 1 ? '' : 's'}`, 'success');
        refreshAfterPrivateMediaChange();
    } catch (error) {
        console.error(error);
        showToast('Could not remove saved voice recordings', 'error');
    }
}


// ============================================================================
// APP DISPLAY / ACCESSIBILITY SETTINGS
// v27: Local, long-term settings for menu mode and press duration.
// These are also exported as optional appSettings in complete backups without
// changing the protected v17+ backup schema fields.
// ============================================================================

const DEFAULT_APP_SETTINGS = {
    displayMode: 'menu',
    pressActivation: 'normal',
    autoUpdateCheck: false,
    popupCloseDelaySeconds: 2,
    introduction: {
        enabled: false,
        text: '',
        fallbackIcon: '👋'
    }
};
const DISPLAY_MODES = new Set(['menu', 'simple-list']);
const PRESS_ACTIVATION_DELAYS = {
    normal: 0,
    long: 650,
    longer: 1100
};
let appSettings = { ...DEFAULT_APP_SETTINGS };
let activePressTimer = null;
let activePressButton = null;
let suppressNextPhraseClick = false;

function normaliseAppSettings(rawSettings) {
    const raw = rawSettings && typeof rawSettings === 'object' ? rawSettings : {};
    const displayMode = DISPLAY_MODES.has(raw.displayMode) ? raw.displayMode : DEFAULT_APP_SETTINGS.displayMode;
    const pressActivation = Object.prototype.hasOwnProperty.call(PRESS_ACTIVATION_DELAYS, raw.pressActivation)
        ? raw.pressActivation
        : DEFAULT_APP_SETTINGS.pressActivation;
    const autoUpdateCheck = raw.autoUpdateCheck === true || raw.autoUpdateCheck === 'on';
    const popupCloseDelaySeconds = clampNumber(Number(raw.popupCloseDelaySeconds || DEFAULT_APP_SETTINGS.popupCloseDelaySeconds), 1, 5);
    const rawIntro = raw.introduction && typeof raw.introduction === 'object' ? raw.introduction : {};
    const introduction = {
        enabled: rawIntro.enabled === true || rawIntro.enabled === 'on',
        text: String(rawIntro.text || '').slice(0, 500),
        fallbackIcon: String(rawIntro.fallbackIcon || DEFAULT_APP_SETTINGS.introduction.fallbackIcon).slice(0, 4) || DEFAULT_APP_SETTINGS.introduction.fallbackIcon
    };
    return { displayMode, pressActivation, autoUpdateCheck, popupCloseDelaySeconds, introduction };
}

function getPopupCloseDelayMs() {
    return clampNumber(Number(normaliseAppSettings(appSettings).popupCloseDelaySeconds), 1, 5) * 1000;
}

function getIntroductionSettings() {
    return normaliseAppSettings(appSettings).introduction;
}

function loadAppSettings() {
    try {
        const stored = localStorage.getItem(APP_SETTINGS_KEY);
        appSettings = normaliseAppSettings(stored ? JSON.parse(stored) : null);
    } catch (error) {
        console.warn('Could not load app settings; using defaults.', error);
        appSettings = normaliseAppSettings(null);
    }
}

function saveAppSettings({ render = true } = {}) {
    appSettings = normaliseAppSettings(appSettings);
    localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(appSettings));
    showAutoSave();
    updateSettingsControls();
    if (render) showMainMenu();
}

function updateSettingsControls() {
    appSettings = normaliseAppSettings(appSettings);
    const displayModeSelect = document.getElementById('settingsDisplayMode');
    if (displayModeSelect) displayModeSelect.value = appSettings.displayMode;
    const pressActivationSelect = document.getElementById('settingsPressActivation');
    if (pressActivationSelect) pressActivationSelect.value = appSettings.pressActivation;
    const delaySlider = document.getElementById('settingsPopupCloseDelay');
    if (delaySlider) delaySlider.value = appSettings.popupCloseDelaySeconds;
    const delayValue = document.getElementById('settingsPopupCloseDelayValue');
    if (delayValue) delayValue.textContent = `${appSettings.popupCloseDelaySeconds} second${appSettings.popupCloseDelaySeconds === 1 ? '' : 's'}`;
    const introEnabled = document.getElementById('settingsIntroductionEnabled');
    if (introEnabled) introEnabled.value = appSettings.introduction.enabled ? 'on' : 'off';
    const introText = document.getElementById('settingsIntroductionText');
    if (introText) introText.value = appSettings.introduction.text || '';
    const introIcon = document.getElementById('settingsIntroductionIcon');
    if (introIcon) introIcon.value = appSettings.introduction.fallbackIcon || DEFAULT_APP_SETTINGS.introduction.fallbackIcon;
    const autoUpdateSelect = document.getElementById('settingsAutoUpdateCheck');
    if (autoUpdateSelect) autoUpdateSelect.value = appSettings.autoUpdateCheck ? 'on' : 'off';
    updateIntroductionSettingsPanelVisibility();
}

function updateIntroductionSettingsPanelVisibility() {
    const enabledSelect = document.getElementById('settingsIntroductionEnabled');
    const panel = document.getElementById('introductionSettingsPanel');
    if (!panel) return;
    panel.hidden = enabledSelect ? enabledSelect.value !== 'on' : !getIntroductionSettings().enabled;
}

function saveIntroductionSettingsFromPanel() {
    const enabledSelect = document.getElementById('settingsIntroductionEnabled');
    const textField = document.getElementById('settingsIntroductionText');
    const iconField = document.getElementById('settingsIntroductionIcon');
    appSettings.introduction = {
        enabled: enabledSelect ? enabledSelect.value === 'on' : false,
        text: textField ? textField.value.trim() : '',
        fallbackIcon: (iconField && iconField.value.trim()) ? iconField.value.trim().slice(0, 4) : DEFAULT_APP_SETTINGS.introduction.fallbackIcon
    };
    saveAppSettings({ render: true });
    showToast('Introduction settings saved', 'success');
}

function showIntroductionImageOptions() {
    window.__mnvImageOptions = {
        kind: 'introduction',
        id: INTRODUCTION_ITEM_ID,
        category: '',
        key: INTRODUCTION_IMAGE_KEY,
        label: 'Introduction picture',
        text: getIntroductionSettings().text || 'Introduction'
    };
    const overlay = ensureManagementImageOptionsOverlay();
    const textEl = overlay.querySelector('#managementImageOptionsText');
    getPrivateMediaRecord(INTRODUCTION_IMAGE_KEY).then(record => {
        const editBtn = overlay.querySelector('[data-image-options-edit]');
        const deleteBtn = overlay.querySelector('[data-image-options-delete]');
        if (textEl) textEl.textContent = record ? 'The introduction button already has a saved picture. You can crop it again, replace it, delete it, or choose a fallback icon.' : 'The introduction button does not yet have a saved picture. You can load/take a picture or choose a fallback icon.';
        if (editBtn) editBtn.disabled = !record;
        if (deleteBtn) deleteBtn.disabled = !record;
    });
    overlay.style.display = 'flex';
    void overlay.offsetWidth;
    overlay.classList.add('show');
}

function playIntroductionFromSettings() {
    const textField = document.getElementById('settingsIntroductionText');
    const text = (textField && textField.value.trim()) || getIntroductionSettings().text || 'Introduction';
    playIntroduction({ text });
}

async function playIntroduction(options = {}) {
    const intro = getIntroductionSettings();
    const text = String(options.text || intro.text || '').trim();
    const popupToken = showPhrasePopup({ id: INTRODUCTION_ITEM_ID, text, isIntroduction: true });
    const fakeButtonInfo = { id: INTRODUCTION_ITEM_ID, text };
    const playedPrivateVoice = await playPrivateVoiceForPhrase(fakeButtonInfo, null, popupToken);
    if (!playedPrivateVoice) speakText(text, null, { popupToken, showPopup: false });
}

async function renderIntroductionHeaderButton() {
    const messageBar = document.getElementById('messageBar');
    const messageText = document.getElementById('messageBarText');
    if (!messageBar || !messageText) return;
    let button = document.getElementById('introductionHeaderButton');
    const intro = getIntroductionSettings();
    if (!intro.enabled) {
        if (button) button.hidden = true;
        messageText.hidden = false;
        messageText.textContent = MAIN_MENU_PROMPT;
        return;
    }
    if (!button) {
        button = document.createElement('button');
        button.id = 'introductionHeaderButton';
        button.type = 'button';
        button.className = 'introduction-header-button';
        button.setAttribute('aria-label', 'Play introduction');
        button.innerHTML = '<img alt="" class="introduction-header-image"><span class="introduction-header-fallback" aria-hidden="true"></span><span class="introduction-header-text">Introduction</span>';
        button.addEventListener('click', () => playIntroduction());
        messageBar.appendChild(button);
    }
    messageText.hidden = true;
    button.hidden = false;
    const fallback = button.querySelector('.introduction-header-fallback');
    const img = button.querySelector('.introduction-header-image');
    if (fallback) fallback.textContent = intro.fallbackIcon || DEFAULT_APP_SETTINGS.introduction.fallbackIcon;
    if (img) {
        img.style.display = 'none';
        img.removeAttribute('src');
        const url = await getPrivateMediaObjectUrl(INTRODUCTION_IMAGE_KEY);
        if (url) {
            img.onload = () => { img.style.display = 'block'; if (fallback) fallback.hidden = true; };
            img.onerror = () => { img.style.display = 'none'; if (fallback) fallback.hidden = false; };
            img.src = url;
        } else if (fallback) {
            fallback.hidden = false;
        }
    }
}

function hideIntroductionHeaderButton() {
    const button = document.getElementById('introductionHeaderButton');
    const messageText = document.getElementById('messageBarText');
    if (button) button.hidden = true;
    if (messageText) messageText.hidden = false;
}

function getPressActivationDelay() {
    const mode = normaliseAppSettings(appSettings).pressActivation;
    return PRESS_ACTIVATION_DELAYS[mode] || 0;
}

function getPressActivationLabel() {
    const mode = normaliseAppSettings(appSettings).pressActivation;
    if (mode === 'longer') return 'Keep holding to speak';
    if (mode === 'long') return 'Hold to speak';
    return '';
}

function cancelPendingPhrasePress() {
    if (activePressTimer) {
        clearTimeout(activePressTimer);
        activePressTimer = null;
    }
    if (activePressButton) {
        activePressButton.classList.remove('press-waiting');
        activePressButton.removeAttribute('data-hold-label');
        activePressButton = null;
    }
}


function installTouchInteractionLock() {
    const appRoot = document.querySelector('.container');
    if (!appRoot || appRoot.dataset.touchInteractionLockInstalled === 'true') return;
    appRoot.dataset.touchInteractionLockInstalled = 'true';

    const isEditableTarget = (target) => Boolean(target && target.closest && target.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]'));
    const isInsideAppRoot = (target) => Boolean(target && appRoot.contains(target));

    const blockAppGesture = (event) => {
        if (!isInsideAppRoot(event.target)) return;
        if (isEditableTarget(event.target)) return;
        event.preventDefault();
    };

    appRoot.addEventListener('contextmenu', blockAppGesture, true);
    appRoot.addEventListener('selectstart', blockAppGesture, true);
    appRoot.addEventListener('dragstart', blockAppGesture, true);
}

function attachPhraseActivation(button, buttonInfo) {
    if (!button || !buttonInfo) return;
    button.dataset.category = buttonInfo.category || button.dataset.category || '';
    if (buttonInfo.id) button.dataset.phraseId = buttonInfo.id;

    const activate = () => speakPhrase(buttonInfo, button);

    button.addEventListener('click', (event) => {
        if (getPressActivationDelay() > 0) {
            event.preventDefault();
            event.stopPropagation();
            if (suppressNextPhraseClick) suppressNextPhraseClick = false;
            return;
        }
        activate();
    });

    button.addEventListener('pointerdown', (event) => {
        const delay = getPressActivationDelay();
        if (delay <= 0) return;
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        event.preventDefault();
        cancelPendingPhrasePress();
        activePressButton = button;
        button.classList.add('press-waiting');
        button.setAttribute('data-hold-label', getPressActivationLabel());
        activePressTimer = setTimeout(() => {
            activePressTimer = null;
            const pressedButton = activePressButton;
            activePressButton = null;
            button.classList.remove('press-waiting');
            button.removeAttribute('data-hold-label');
            suppressNextPhraseClick = true;
            if (pressedButton === button) activate();
        }, delay);
    });

    ['pointerup', 'pointercancel', 'pointerleave'].forEach(eventName => {
        button.addEventListener(eventName, () => {
            if (activePressButton === button) cancelPendingPhrasePress();
        });
    });

    button.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            activate();
        }
    });
}

const CATEGORY_META = {
    "quick": {
        "label": "Quick Words",
        "prefix": "quick",
        "menuImage": "menu01_quick.jpg",
        "colour": "#34495E",
        "dark": "#1F2D3A",
        "soft": "#EEF2F4",
        "icon": "✅"
    },
    "health": {
        "label": "Health",
        "prefix": "health",
        "menuImage": "menu02_health.jpg",
        "colour": "#E74C3C",
        "dark": "#A93226",
        "soft": "#FDEDEC",
        "icon": "❤️"
    },
    "selfcare": {
        "label": "Self Care",
        "prefix": "selfcare",
        "menuImage": "menu03_selfcare.jpg",
        "colour": "#16A085",
        "dark": "#0E6655",
        "soft": "#E0F2F1",
        "icon": "🧼"
    },
    "food": {
        "label": "Food & Drink",
        "prefix": "food",
        "menuImage": "menu04_food.jpg",
        "colour": "#E67E22",
        "dark": "#BA5B0B",
        "soft": "#FFF3E0",
        "icon": "🍽️"
    },
    "environment": {
        "label": "Comfort",
        "prefix": "comfort",
        "menuImage": "menu05_comfort.jpg",
        "colour": "#607D8B",
        "dark": "#37474F",
        "soft": "#ECEFF1",
        "icon": "🛋️"
    },
    "MyPeople": {
        "label": "My People",
        "prefix": "people",
        "menuImage": "menu06_people.jpg",
        "colour": "#2E86C1",
        "dark": "#1B4F72",
        "soft": "#EAF2F8",
        "icon": "👤"
    },
    "feelings": {
        "label": "Feelings",
        "prefix": "feelings",
        "menuImage": "menu07_feelings.jpg",
        "colour": "#9B59B6",
        "dark": "#6C3483",
        "soft": "#F3E5F5",
        "icon": "😊"
    },
    "routine": {
        "label": "Daily Routine",
        "prefix": "routine",
        "menuImage": "menu08_routine.jpg",
        "colour": "#3498DB",
        "dark": "#21618C",
        "soft": "#EAF2F8",
        "icon": "🕒"
    },
    "social": {
        "label": "Social Chat",
        "prefix": "social",
        "menuImage": "menu09_social.jpg",
        "colour": "#F39C12",
        "dark": "#B9770E",
        "soft": "#FEF5E7",
        "icon": "💬"
    },
    "activities": {
        "label": "Activities",
        "prefix": "activities",
        "menuImage": "menu10_activities.jpg",
        "colour": "#27AE60",
        "dark": "#196F3D",
        "soft": "#E9F7EF",
        "icon": "🚶"
    },
    "memories": {
        "label": "Memories",
        "prefix": "memories",
        "menuImage": "menu11_memories.jpg",
        "colour": "#795548",
        "dark": "#4E342E",
        "soft": "#EFEBE9",
        "icon": "📷"
    }
};

// ============================================================================
// CATEGORY / TOP MENU CONFIGURATION
// ============================================================================

const DEFAULT_CATEGORY_ORDER = Object.keys(CATEGORY_META);
let categoryConfig = { order: DEFAULT_CATEGORY_ORDER.slice(), categories: {} };
let contentSetupSelected = null;
let contentSetupPhraseCategory = DEFAULT_CATEGORY_ORDER[0] || 'quick';

function makeFallbackCategoryMeta(category) {
    const safeCategory = String(category || 'custom').trim() || 'custom';
    const configured = categoryConfig && categoryConfig.categories ? categoryConfig.categories[safeCategory] : null;
    const readable = safeCategory
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase());
    return {
        label: configured?.label || readable || safeCategory,
        prefix: safeCategory.replace(/[^a-z0-9]+/gi, '').toLowerCase() || 'custom',
        menuImage: `${safeCategory}.jpg`,
        colour: '#4F46E5',
        dark: '#312E81',
        soft: '#EEF2FF',
        icon: '💬'
    };
}

function normaliseCategoryConfig(rawConfig) {
    const raw = rawConfig && typeof rawConfig === 'object' ? rawConfig : {};
    const rawCategories = raw.categories && typeof raw.categories === 'object' ? raw.categories : {};
    const order = [];

    const addCategory = (category) => {
        const id = String(category || '').trim();
        if (!id) return;
        if (!order.includes(id)) order.push(id);
    };

    if (Array.isArray(raw.order)) raw.order.forEach(addCategory);
    DEFAULT_CATEGORY_ORDER.forEach(addCategory);
    if (buttonData && typeof buttonData === 'object') Object.keys(buttonData).forEach(addCategory);
    Object.keys(rawCategories).forEach(addCategory);

    const categories = {};
    order.forEach(category => {
        const fallback = makeFallbackCategoryMeta(category);
        const builtIn = CATEGORY_META[category] || fallback;
        const incoming = rawCategories[category] && typeof rawCategories[category] === 'object' ? rawCategories[category] : {};
        const label = String(incoming.label || builtIn.label || category).trim();
        categories[category] = {
            ...incoming,
            label: label || builtIn.label || category,
            hidden: Boolean(incoming.hidden)
        };
    });

    return { order, categories };
}

function loadCategoryConfig() {
    try {
        const stored = localStorage.getItem(CATEGORY_CONFIG_KEY);
        categoryConfig = normaliseCategoryConfig(stored ? JSON.parse(stored) : null);
    } catch (error) {
        console.warn('Could not load category configuration; using defaults.', error);
        categoryConfig = normaliseCategoryConfig(null);
    }
}

function saveCategoryConfig() {
    categoryConfig = normaliseCategoryConfig(categoryConfig);
    localStorage.setItem(CATEGORY_CONFIG_KEY, JSON.stringify(categoryConfig));
    showAutoSave();
}

function getCategoryOrder({ includeHidden = false } = {}) {
    categoryConfig = normaliseCategoryConfig(categoryConfig);
    return categoryConfig.order.filter(category => {
        if (!buttonData || !Object.prototype.hasOwnProperty.call(buttonData, category)) return false;
        if (!Array.isArray(buttonData[category])) return false;
        if (includeHidden) return true;
        return !categoryConfig.categories[category]?.hidden;
    });
}

function getCategoryConfigEntry(category) {
    categoryConfig = normaliseCategoryConfig(categoryConfig);
    return categoryConfig.categories[category] || {};
}

function setContentSetupSelected(selection) {
    contentSetupSelected = selection;
}

function moveArrayItem(array, fromIndex, toIndex) {
    if (!Array.isArray(array)) return array;
    if (fromIndex < 0 || fromIndex >= array.length) return array;
    if (toIndex < 0 || toIndex >= array.length) return array;
    const [item] = array.splice(fromIndex, 1);
    array.splice(toIndex, 0, item);
    return array;
}

function generateNextCustomCategoryId(baseLabel = 'custom_topic') {
    const base = String(baseLabel || 'custom_topic').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'custom_topic';
    const existing = new Set([...(categoryConfig.order || []), ...Object.keys(buttonData || {})]);
    let candidate = base;
    let counter = 1;
    while (existing.has(candidate)) {
        candidate = `${base}_${String(counter++).padStart(3, '0')}`;
    }
    return candidate;
}

function generateNextPhraseId(category) {
    const meta = getCategoryMeta(category);
    const prefix = String(meta.prefix || category || 'phrase').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'phrase';
    const existing = new Set((buttonData[category] || []).map(item => String(item.id || '').toLowerCase()));
    let maxNumber = 0;
    (buttonData[category] || []).forEach(item => {
        const match = String(item.id || '').match(new RegExp(`^${prefix}(\\d+)$`, 'i'));
        if (match) maxNumber = Math.max(maxNumber, parseInt(match[1], 10));
    });
    let next = maxNumber + 1;
    let id = `${prefix}${String(next).padStart(2, '0')}`;
    while (existing.has(id.toLowerCase())) {
        next += 1;
        id = `${prefix}${String(next).padStart(2, '0')}`;
    }
    return id;
}

function getDisplayPhrases(category, { includeHidden = false } = {}) {
    const phrases = buttonData[category] || [];
    return includeHidden ? phrases : phrases.filter(item => !item.hidden);
}




// Function to save all data to localStorage
function saveDataToStorage() {
  try {
    const payload = {
      buttonData,
      categoryConfig,
      appSettings: normaliseAppSettings(appSettings),
      lastModified: new Date().toISOString()
    };
    const compressed = LZString.compressToUTF16(JSON.stringify(payload));
    localStorage.setItem(STORAGE_KEY, compressed);
    console.log(`Data compressed and saved at ${payload.lastModified}`);
    showAutoSave();
  } catch (error) {
    console.error('Error saving compressed data:', error);
    showToast('Error saving data', 'error');
  }
}


// Function to load data from localStorage
function loadDataFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {

      // 🧩 Backward-compatibility for old uncompressed JSON
      if (stored.startsWith('{')) {
        const parsed = JSON.parse(stored);
        buttonData = parsed.buttonData || parsed;
        categoryConfig = normaliseCategoryConfig(parsed.categoryConfig || categoryConfig);
        saveCategoryConfig();
        if (parsed.appSettings) {
          appSettings = normaliseAppSettings(parsed.appSettings);
          saveAppSettings({ render: false });
        }
        console.log('Loaded uncompressed legacy data — re-saving as compressed.');
        saveDataToStorage(); // Re-compress and store safely
        return;
      }

      // 🧩 Standard decompression path (new format)
      const decompressed = LZString.decompressFromUTF16(stored);
      const parsed = JSON.parse(decompressed);
      if (parsed.buttonData) buttonData = parsed.buttonData;
      if (parsed.categoryConfig) {
        categoryConfig = normaliseCategoryConfig(parsed.categoryConfig);
        saveCategoryConfig();
      }
      categoryConfig = normaliseCategoryConfig(parsed.categoryConfig || categoryConfig);
      saveCategoryConfig();
      if (parsed.appSettings) {
        appSettings = normaliseAppSettings(parsed.appSettings);
        saveAppSettings({ render: false });
      }
      if (parsed.lastModified)
        console.log('Loaded compressed data last modified:', parsed.lastModified);

    } else {
      console.warn('No stored data found — loading defaults.');
      buttonData = JSON.parse(JSON.stringify(defaultButtonData));
      saveDataToStorage();
    }
  } catch (e) {
    console.error('Error decompressing data, restoring defaults.', e);
    buttonData = JSON.parse(JSON.stringify(defaultButtonData));
    saveDataToStorage();
  }
}


// Function to reset to default data
function resetToDefaultData() {
    if (confirm('Are you sure you want to reset all content and top menu setup to default? This cannot be undone.')) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(CATEGORY_CONFIG_KEY);
        location.reload();
    }
}

// ============================================================================
// TOAST NOTIFICATIONS
// ============================================================================


function showAutoSave() {
  const indicator = document.getElementById('autosaveIndicator');
  if (!indicator) return;
  indicator.classList.add('show');
  setTimeout(() => indicator.classList.remove('show'), 1500);
}


function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = 'toast show';
    
    // Remove previous type classes
    toast.classList.remove('success', 'error', 'warning', 'info');
    
    // Add current type class
    if (type !== 'info') {
        toast.classList.add(type);
    }
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ============================================================================
// LOADING INDICATOR
// ============================================================================

function showLoading() {
    const loader = document.getElementById('loadingIndicator');
    if (loader) loader.style.display = 'flex';
}

function hideLoading() {
    const loader = document.getElementById('loadingIndicator');
    if (loader) loader.style.display = 'none';
}

// ============================================================================
// PASSWORD PROTECTION
// ============================================================================

function showPasswordModal(action = 'management') {
    pendingPasswordAction = action || 'management';
    const modal = document.getElementById('passwordModal');
    const title = document.getElementById('passwordModalTitle');
    const description = modal ? modal.querySelector('p') : null;
    const actionLabels = {
        privateSetup: ['Photo / Voice Setup Access', 'Enter password to change photos and recorded voices:'],
        exportFullBackup: ['Complete Backup Access', 'Enter password to export menus, phrases, photos, and recorded voices:'],
        importFullBackup: ['Complete Backup Access', 'Enter password to import menus, phrases, photos, and recorded voices:'],
        clearAllImages: ['Remove All Images', 'Enter password to remove all locally saved images from this device:'],
        clearAllAudio: ['Remove All Audio', 'Enter password to remove all locally recorded voices from this device:'],
        management: ['Content Management Access', 'Enter password to manage content:'],
        settings: ['Settings Access', 'Enter password to open Settings:']
    };
    const label = actionLabels[pendingPasswordAction] || actionLabels.management;
    if (title) title.textContent = label[0];
    if (description) description.textContent = label[1];
    modal.style.display = 'flex';
    document.getElementById('passwordInput').value = '';
    document.getElementById('passwordInput').focus();
}

function hidePasswordModal() {
    document.getElementById('passwordModal').style.display = 'none';
    document.getElementById('passwordInput').value = '';
    pendingPasswordAction = 'management';
}

function checkPassword() {
    const input = document.getElementById('passwordInput').value;
    
    if (input === MANAGEMENT_PASSWORD) {
        const action = pendingPasswordAction;
        hidePasswordModal();
        if (action === 'settings') {
            showSettingsOverlay();
        } else if (action === 'privateSetup') {
            // v26: legacy Photo / Voice Setup route now opens the current editor-style content manager.
            showManagementPanel();
        } else if (action === 'exportFullBackup') {
            exportFullAppBackup();
        } else if (action === 'importFullBackup') {
            const input = document.getElementById('fullBackupImportFile');
            if (input) input.click();
        } else if (action === 'clearAllImages') {
            confirmAndClearAllImages();
        } else if (action === 'clearAllAudio') {
            confirmAndClearAllAudio();
        } else {
            showManagementPanel();
        }
    } else {
        showToast('Incorrect password. Please try again.', 'error');
        document.getElementById('passwordInput').value = '';
        document.getElementById('passwordInput').focus();
    }
}

// === MANAGEMENT OVERLAY SHOW/HIDE ===
// ============================================================================
// MANAGEMENT PANEL FUNCTIONS
// ============================================================================

function showManagementPanel() {
    const overlay = document.getElementById('managementOverlay');
    const panel = document.getElementById('managementPanel');

    if (overlay && panel) {
        renderContentManagementPanel();
        overlay.style.display = 'flex';
        overlay.classList.add('show');

        setTimeout(() => {
            const firstButton = panel.querySelector('button, input, select');
            if (firstButton) firstButton.focus();
        }, 100);
    }
}

function hideManagementPanel() {
    const overlay = document.getElementById('managementOverlay');
    const panel = document.getElementById('managementPanel');
    
    if (overlay && panel) {
        overlay.classList.remove('show');
        overlay.style.display = 'none';
    }
}


// ============================================================================
// V14 CARER CONTENT SETUP DASHBOARD
// ============================================================================

function renderContentManagementPanel() {
    const panel = document.getElementById('managementPanel');
    if (!panel) return;

    categoryConfig = normaliseCategoryConfig(categoryConfig);
    const allCategories = getCategoryOrder({ includeHidden: true });
    if (!contentSetupPhraseCategory || !buttonData[contentSetupPhraseCategory]) {
        contentSetupPhraseCategory = allCategories[0] || 'quick';
    }
    if (!contentEditorScreen) contentEditorScreen = 'topics';

    if (contentEditorScreen === 'phrases') {
        renderContentPhraseScreen(panel, contentSetupPhraseCategory);
    } else {
        contentEditorScreen = 'topics';
        renderContentTopicsScreen(panel, allCategories);
    }

    panel.onclick = handleContentManagementClick;
    panel.onchange = handleContentManagementChange;
    applyPrivateImagesIn(panel);
}

function renderContentTopicsScreen(panel, allCategories) {
    panel.innerHTML = `
        <div class="content-setup-header editor-style-header compact-editor-header">
            <button type="button" class="management-btn editor-back-settings-btn" data-content-back-settings>← Back to Settings</button>
            <div class="compact-editor-title">
                <h3 id="managementPanelTitle">Content Editor</h3>
            </div>
        </div>

        <div class="private-section-details editor-details open-editor-section">
            <div class="editor-section-title">Main menu topics</div>
            <div class="editor-table-scroll-hint">Scroll sideways if more columns are off screen.</div>
            <div class="editor-table-wrap">
                <table class="management-editor-table topic-editor-table">
                    <thead>
                        <tr>
                            <th>Picture</th>
                            <th>Title</th>
                            <th>Fallback icon</th>
                            <th>Edit content</th>
                            <th>Move</th>
                            <th>Show / hide</th>
                            <th>Delete</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${renderContentCategoryRows(allCategories)}
                        <tr class="management-add-row"><td colspan="7"><button type="button" class="management-add-line" data-content-add-topic-row>＋ Add new main menu topic</button></td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div class="private-setup-footer editor-bottom-actions">
            <button type="button" class="management-btn" data-content-back-settings>Cancel</button>
            <button type="button" class="management-btn save-private-setup" data-content-save-close>✅ SAVE CHANGES</button>
        </div>
    `;
}

function renderContentPhraseScreen(panel, category) {
    const phrases = buttonData[category] || [];
    const meta = getCategoryMeta(category);
    panel.innerHTML = `
        <div class="content-setup-header editor-style-header compact-editor-header">
            <div class="compact-editor-title">
                <h3 id="managementPanelTitle">${escapeHtml(meta.label)}</h3>
            </div>
        </div>

        <div class="private-section-details editor-details open-editor-section">
            <div class="editor-section-title">Phrases in ${escapeHtml(meta.label)}</div>
            <div class="editor-table-scroll-hint">Scroll sideways if more columns are off screen.</div>
            <div class="editor-table-wrap">
                <table class="management-editor-table phrase-editor-table">
                    <thead>
                        <tr>
                            <th>Picture</th>
                            <th>Phrase</th>
                            <th>Fallback icon</th>
                            <th>Voice</th>
                            <th>Move</th>
                            <th>Show / hide</th>
                            <th>Delete</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${renderContentPhraseRows(category, phrases)}
                        <tr class="management-add-row"><td colspan="7"><button type="button" class="management-add-line" data-content-add-phrase-row>＋ Add new phrase</button></td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div class="private-setup-footer editor-bottom-actions">
            <button type="button" class="management-btn" data-content-back-topics>Cancel</button>
            <button type="button" class="management-btn save-private-setup" data-content-save-close>✅ SAVE CHANGES</button>
        </div>
    `;
}


function renderMediaThumbForManagement(kind, id, people = false, fallbackIcon = '') {
    const key = getPrivateMediaKey(kind, kind === 'menu' ? id : { id });
    const roundClass = people ? ' people-thumb' : '';
    const iconText = fallbackIcon || (kind === 'menu' ? getCategoryMeta(id).icon : '🖼️');
    return `
        <button type="button" class="management-media-thumb${roundClass}" data-management-image-options data-key="${escapeHtml(key)}" data-kind="${escapeHtml(kind)}" data-id="${escapeHtml(id)}" data-people="${people ? '1' : '0'}" aria-label="Edit picture">
            <img alt="" data-private-media-key="${escapeHtml(key)}" style="display:none;">
            <span class="management-thumb-fallback" data-management-thumb-key="${escapeHtml(key)}">${escapeHtml(iconText)}</span>
        </button>
    `;
}

function renderContentCategoryRows(allCategories) {
    return allCategories.map(category => {
        const meta = getCategoryMeta(category);
        const hidden = meta.hidden ? 'checked' : '';
        const index = allCategories.indexOf(category);
        return `
            <tr class="management-topic-row ${contentSetupSelected?.type === 'category' && contentSetupSelected.category === category ? 'selected-row' : ''}">
                <td>${renderMediaThumbForManagement('menu', category, false, meta.icon || '🗂️')}</td>
                <td>
                    <input type="text" class="management-input table-title-input" data-content-inline-category-label="${escapeHtml(category)}" value="${escapeHtml(meta.label)}">
                    <div class="help-text">ID: <code>${escapeHtml(category)}</code></div>
                </td>
                <td class="icon-cell">
                    <input type="text" class="management-input icon-input" data-content-inline-category-icon="${escapeHtml(category)}" maxlength="4" value="${escapeHtml(meta.icon || '')}" placeholder="🗂️">
                    <button type="button" class="management-btn small-management-btn" data-icon-menu data-kind="menu" data-id="${escapeHtml(category)}">Choose</button>
                </td>
                <td><button type="button" class="management-btn" data-content-open-topic="${escapeHtml(category)}">Edit content</button></td>
                <td class="table-button-stack">
                    <button type="button" class="management-btn small-management-btn" data-content-move-category-row="up" data-category="${escapeHtml(category)}" ${index <= 0 ? 'disabled' : ''}>↑</button>
                    <button type="button" class="management-btn small-management-btn" data-content-move-category-row="down" data-category="${escapeHtml(category)}" ${index >= allCategories.length - 1 ? 'disabled' : ''}>↓</button>
                </td>
                <td>
                    <label class="content-checkbox-row compact-checkbox"><input type="checkbox" data-content-inline-category-hidden="${escapeHtml(category)}" ${hidden}> Hidden</label>
                </td>
                <td><button type="button" class="management-btn remove-btn small-management-btn" data-content-delete-topic-row="${escapeHtml(category)}">Delete</button></td>
            </tr>
        `;
    }).join('') || '<tr><td colspan="7">No topics found.</td></tr>';
}

function renderVoiceStatusBadge(voiceKey) {
    const hasVoice = Boolean(voiceKey && privateVoiceKeySet.has(voiceKey));
    return `
        <span class="voice-status-badge ${hasVoice ? 'voice-saved' : 'voice-none'}" title="${hasVoice ? 'A recorded voice is saved for this phrase.' : 'No recorded voice is saved; device speech will be used.'}">
            ${hasVoice ? '🎙️ Voice saved' : 'Voice: none'}
        </span>
    `;
}

function renderContentPhraseRows(category, phrases) {
    const people = category === 'MyPeople';
    return phrases.map((phrase, index) => {
        const active = contentSetupSelected?.type === 'phrase' && contentSetupSelected.category === category && contentSetupSelected.phraseId === phrase.id;
        const voiceKey = getPrivateMediaKey('voice', phrase);
        const fallbackIcon = phrase.icon || getFallbackIcon(category, phrase.text || '');
        return `
            <tr class="management-phrase-row ${active ? 'selected-row' : ''}">
                <td>${renderMediaThumbForManagement('phrase', phrase.id || '', people, fallbackIcon)}</td>
                <td>
                    <input type="text" class="management-input table-title-input" data-content-inline-phrase-text="${escapeHtml(phrase.id || '')}" data-category="${escapeHtml(category)}" value="${escapeHtml(phrase.text || '')}" placeholder="Enter phrase text">
                    <div class="help-text">ID: <code>${escapeHtml(phrase.id || '')}</code></div>
                </td>
                <td class="icon-cell">
                    <input type="text" class="management-input icon-input" data-content-inline-phrase-icon="${escapeHtml(phrase.id || '')}" data-category="${escapeHtml(category)}" maxlength="4" value="${escapeHtml(phrase.icon || '')}" placeholder="${escapeHtml(fallbackIcon)}">
                    <button type="button" class="management-btn small-management-btn" data-icon-menu data-kind="phrase" data-category="${escapeHtml(category)}" data-id="${escapeHtml(phrase.id || '')}">Choose</button>
                </td>
                <td class="table-button-stack voice-buttons">
                    ${renderVoiceStatusBadge(voiceKey)}
                    <button type="button" class="management-btn small-management-btn" data-record-voice data-key="${escapeHtml(voiceKey)}" data-text="${escapeHtml(phrase.text || '')}">🎙️ Record</button>
                    <button type="button" class="management-btn small-management-btn" data-play-voice data-key="${escapeHtml(voiceKey)}">▶️ Play</button>
                    <button type="button" class="management-btn remove-btn small-management-btn" data-delete-media data-key="${escapeHtml(voiceKey)}">Delete</button>
                </td>
                <td class="table-button-stack">
                    <button type="button" class="management-btn small-management-btn" data-content-move-phrase-row="up" data-index="${index}" ${index <= 0 ? 'disabled' : ''}>↑</button>
                    <button type="button" class="management-btn small-management-btn" data-content-move-phrase-row="down" data-index="${index}" ${index >= phrases.length - 1 ? 'disabled' : ''}>↓</button>
                </td>
                <td><label class="content-checkbox-row compact-checkbox"><input type="checkbox" data-content-inline-phrase-hidden="${escapeHtml(phrase.id || '')}" data-category="${escapeHtml(category)}" ${phrase.hidden ? 'checked' : ''}> Hidden</label></td>
                <td><button type="button" class="management-btn remove-btn small-management-btn" data-content-delete-phrase-row="${escapeHtml(phrase.id || '')}" data-category="${escapeHtml(category)}">Delete</button></td>
            </tr>
        `;
    }).join('') || '<tr><td colspan="7" class="help-text">No phrases in this section yet.</td></tr>';
}

function renderContentSelectedEditor() {
    if (!contentSetupSelected) return '<p>Select a top menu section or phrase to edit.</p>';

    if (contentSetupSelected.type === 'category') {
        const category = contentSetupSelected.category;
        const meta = getCategoryMeta(category);
        const allCategories = getCategoryOrder({ includeHidden: true });
        const index = allCategories.indexOf(category);
        return `
            <h4>Top menu section</h4>
            <p class="private-selected-help">Rename, hide/show, reorder, or change the picture for this main menu card.</p>
            <code>${escapeHtml(category)}</code>
            <div class="content-button-row">
                <button type="button" class="management-btn" data-pick-image data-key="${escapeHtml(getPrivateMediaKey('menu', category))}" data-label="${escapeHtml(meta.label)} main menu button picture">Choose / take picture for this main menu button</button>
                <button type="button" class="management-btn remove-btn" data-delete-media data-key="${escapeHtml(getPrivateMediaKey('menu', category))}">Remove main menu picture</button>
            </div>
            <label>Section title
                <input type="text" id="contentCategoryLabel" class="management-input" maxlength="40" value="${escapeHtml(meta.label)}">
            </label>
            <label class="content-checkbox-row">
                <input type="checkbox" id="contentCategoryHidden" ${meta.hidden ? 'checked' : ''}>
                Hide this section from Dad's main menu
            </label>
            <div class="content-button-row">
                <button type="button" class="management-btn" data-content-move-category="up" ${index <= 0 ? 'disabled' : ''}>⬆️ Move up</button>
                <button type="button" class="management-btn" data-content-move-category="down" ${index >= allCategories.length - 1 ? 'disabled' : ''}>⬇️ Move down</button>
                <button type="button" class="management-btn" data-content-save-category>💾 Save section</button>
            </div>
        `;
    }

    const category = contentSetupSelected.category;
    const phrase = findPhraseById(category, contentSetupSelected.phraseId);
    if (!phrase) return '<p>The selected phrase could not be found.</p>';

    const phraseList = buttonData[category] || [];
    const index = phraseList.indexOf(phrase);
    return `
        <h4>Phrase item</h4>
        <p class="private-selected-help">Edit the wording Dad sees and hears. Add one picture for this phrase and optionally record a voice. Use Hide if you may want this phrase again later.</p>
        <code>${escapeHtml(phrase.id || '')} · ${escapeHtml(getPhraseFilenameForSetup(category, phrase))}</code>
        <div class="content-button-row">
            <button type="button" class="management-btn" data-pick-image data-key="${escapeHtml(getPrivateMediaKey('phrase', phrase))}" data-label="${escapeHtml((phrase.text || 'Selected phrase') + ' phrase picture')}" data-text="${escapeHtml(phrase.text || '')}">Choose / take phrase picture</button>
            <button type="button" class="management-btn remove-btn" data-delete-media data-key="${escapeHtml(getPrivateMediaKey('phrase', phrase))}">Remove phrase picture</button>
            <button type="button" class="management-btn" data-record-voice data-key="${escapeHtml(getPrivateMediaKey('voice', phrase))}" data-text="${escapeHtml(phrase.text || '')}">🎙️ Record / re-record voice</button>
            <button type="button" class="management-btn" data-play-voice data-key="${escapeHtml(getPrivateMediaKey('voice', phrase))}">▶️ Play voice</button>
            <button type="button" class="management-btn remove-btn" data-delete-media data-key="${escapeHtml(getPrivateMediaKey('voice', phrase))}">Delete voice</button>
        </div>
        <label>Phrase text
            <input type="text" id="contentPhraseText" class="management-input" maxlength="200" value="${escapeHtml(phrase.text || '')}">
        </label>
        <label>Optional fallback icon
            <input type="text" id="contentPhraseIcon" class="management-input" maxlength="4" value="${escapeHtml(phrase.icon || '')}" placeholder="${escapeHtml(getFallbackIcon(category, phrase.text || ''))}">
        </label>
        <label class="content-checkbox-row">
            <input type="checkbox" id="contentPhraseHidden" ${phrase.hidden ? 'checked' : ''}>
            Hide this phrase from Dad's submenu
        </label>
        <div class="content-button-row">
            <button type="button" class="management-btn" data-content-move-phrase="up" ${index <= 0 ? 'disabled' : ''}>⬆️ Move up</button>
            <button type="button" class="management-btn" data-content-move-phrase="down" ${index >= phraseList.length - 1 ? 'disabled' : ''}>⬇️ Move down</button>
            <button type="button" class="management-btn" data-content-save-phrase>💾 Save phrase</button>
            <button type="button" class="management-btn remove-btn" data-content-delete-phrase>🗑️ Delete phrase</button>
        </div>
    `;
}

function handleContentManagementClick(event) {
    const target = event.target;

    if (target.closest('[data-content-close]')) {
        if (contentEditorScreen === 'phrases') {
            contentEditorScreen = 'topics';
            renderContentManagementPanel();
        } else {
            hideManagementPanel();
            showSettingsOverlay();
        }
        return;
    }
    if (target.closest('[data-content-back-settings]')) {
        hideManagementPanel();
        showSettingsOverlay();
        return;
    }

    if (target.closest('[data-content-save-close]')) {
        if (contentEditorScreen === 'phrases') {
            contentEditorScreen = 'topics';
            contentSetupSelected = { type: 'category', category: contentSetupPhraseCategory };
            renderContentManagementPanel();
            showToast('Phrase changes saved', 'success');
        } else {
            hideManagementPanel();
            showSettingsOverlay();
            showToast('Content changes saved', 'success');
        }
        return;
    }

    const imageOptionsButton = target.closest('[data-management-image-options]');
    if (imageOptionsButton) {
        const kind = imageOptionsButton.dataset.kind;
        const id = imageOptionsButton.dataset.id;
        showManagementImageOptions(kind, id, contentSetupPhraseCategory);
        return;
    }

    const iconMenuButton = target.closest('[data-icon-menu]');
    if (iconMenuButton) {
        showFallbackIconMenu(iconMenuButton.dataset.kind, iconMenuButton.dataset.id, iconMenuButton.dataset.category || contentSetupPhraseCategory);
        return;
    }

    const deleteMediaButton = target.closest('[data-delete-media]');
    if (deleteMediaButton) {
        deletePrivateMediaFromSetup(deleteMediaButton.dataset.key);
        return;
    }

    const pickImageButton = target.closest('[data-pick-image]');
    if (pickImageButton) {
        choosePrivateImage(pickImageButton.dataset.key, pickImageButton.dataset.label, pickImageButton.dataset.text || '');
        return;
    }

    const recordButton = target.closest('[data-record-voice]');
    if (recordButton) {
        toggleVoiceRecording(recordButton.dataset.key, recordButton.dataset.text || '', recordButton);
        return;
    }

    const playButton = target.closest('[data-play-voice]');
    if (playButton) {
        playSetupVoice(playButton.dataset.key);
        return;
    }

    if (target.closest('[data-content-add-topic-row]')) {
        const id = generateNextCustomCategoryId('new_topic');
        categoryConfig.order.push(id);
        categoryConfig.categories[id] = { label: 'New topic', hidden: false, icon: '🗂️' };
        buttonData[id] = [];
        saveCategoryConfig();
        saveDataToStorage();
        renderCategoryMenuCards();
        renderContentManagementPanel();
        showToast('New topic row added. Type the title into the row.', 'success');
        return;
    }

    const deleteTopicRowButton = target.closest('[data-content-delete-topic-row]');
    if (deleteTopicRowButton) {
        const category = deleteTopicRowButton.dataset.contentDeleteTopicRow;
        const meta = getCategoryMeta(category);
        if (!confirm(`Delete the whole topic "${meta.label}" and all phrases/images/audio linked to it? Hiding is safer. This cannot be undone unless you restore a backup.`)) return;
        if (!confirm('Final confirmation: delete this topic now?')) return;
        const phrases = buttonData[category] || [];
        phrases.forEach(phrase => {
            deletePrivateMediaRecord(getPrivateMediaKey('phrase', phrase));
            deletePrivateMediaRecord(getPrivateMediaKey('voice', phrase));
        });
        deletePrivateMediaRecord(getPrivateMediaKey('menu', category));
        delete buttonData[category];
        delete categoryConfig.categories[category];
        categoryConfig.order = (categoryConfig.order || []).filter(item => item !== category);
        saveCategoryConfig();
        saveDataToStorage();
        renderCategoryMenuCards();
        renderContentManagementPanel();
        showToast('Topic deleted', 'success');
        return;
    }

    if (target.closest('[data-content-add-phrase-row]')) {
        const category = contentSetupPhraseCategory;
        if (!buttonData[category]) buttonData[category] = [];
        const id = generateNextPhraseId(category);
        const phrase = { text: 'New phrase', image: `${id}.jpg`, id };
        buttonData[category].push(phrase);
        contentSetupSelected = { type: 'phrase', category, phraseId: id };
        saveDataToStorage();
        if (currentViewCategory === category) populateGrid(category);
        renderContentManagementPanel();
        showToast('New phrase row added. Type the wording into the row.', 'success');
        return;
    }

    const deletePhraseRowButton = target.closest('[data-content-delete-phrase-row]');
    if (deletePhraseRowButton) {
        const category = deletePhraseRowButton.dataset.category || contentSetupPhraseCategory;
        const phraseId = deletePhraseRowButton.dataset.contentDeletePhraseRow;
        const phrases = buttonData[category] || [];
        const index = phrases.findIndex(item => item.id === phraseId);
        if (index < 0) return;
        if (!confirm('Delete this phrase permanently? Hiding is usually safer.')) return;
        const phrase = phrases[index];
        deletePrivateMediaRecord(getPrivateMediaKey('phrase', phrase));
        deletePrivateMediaRecord(getPrivateMediaKey('voice', phrase));
        phrases.splice(index, 1);
        saveDataToStorage();
        if (currentViewCategory === category) populateGrid(category);
        renderContentManagementPanel();
        showToast('Phrase deleted', 'success');
        return;
    }

    const rowMoveCategoryButton = target.closest('[data-content-move-category-row]');
    if (rowMoveCategoryButton) {
        const direction = rowMoveCategoryButton.dataset.contentMoveCategoryRow;
        const category = rowMoveCategoryButton.dataset.category;
        const order = categoryConfig.order;
        const index = order.indexOf(category);
        moveArrayItem(order, index, direction === 'up' ? index - 1 : index + 1);
        saveCategoryConfig();
        renderCategoryMenuCards();
        renderContentManagementPanel();
        return;
    }

    const rowMovePhraseButton = target.closest('[data-content-move-phrase-row]');
    if (rowMovePhraseButton) {
        const phrases = buttonData[contentSetupPhraseCategory] || [];
        const index = Number(rowMovePhraseButton.dataset.index);
        const direction = rowMovePhraseButton.dataset.contentMovePhraseRow;
        moveArrayItem(phrases, index, direction === 'up' ? index - 1 : index + 1);
        saveDataToStorage();
        if (currentViewCategory === contentSetupPhraseCategory) populateGrid(contentSetupPhraseCategory);
        renderContentManagementPanel();
        return;
    }

    if (target.closest('[data-content-back-topics]')) {
        contentEditorScreen = 'topics';
        contentSetupSelected = { type: 'category', category: contentSetupPhraseCategory };
        renderContentManagementPanel();
        return;
    }

    const openTopicButton = target.closest('[data-content-open-topic]');
    if (openTopicButton) {
        contentSetupPhraseCategory = openTopicButton.dataset.contentOpenTopic;
        contentEditorScreen = 'phrases';
        const firstPhrase = (buttonData[contentSetupPhraseCategory] || [])[0];
        contentSetupSelected = firstPhrase ? { type: 'phrase', category: contentSetupPhraseCategory, phraseId: firstPhrase.id } : { type: 'category', category: contentSetupPhraseCategory };
        renderContentManagementPanel();
        return;
    }

    const categoryButton = target.closest('[data-content-select-category]');
    if (categoryButton) {
        contentSetupPhraseCategory = categoryButton.dataset.contentSelectCategory;
        setContentSetupSelected({ type: 'category', category: categoryButton.dataset.contentSelectCategory });
        renderContentManagementPanel();
        return;
    }

    const phraseButton = target.closest('[data-content-select-phrase]');
    if (phraseButton) {
        contentSetupPhraseCategory = phraseButton.dataset.category;
        setContentSetupSelected({ type: 'phrase', category: phraseButton.dataset.category, phraseId: phraseButton.dataset.contentSelectPhrase });
        renderContentManagementPanel();
        return;
    }

    const moveCategoryButton = target.closest('[data-content-move-category]');
    if (moveCategoryButton && contentSetupSelected?.type === 'category') {
        const direction = moveCategoryButton.dataset.contentMoveCategory;
        const order = categoryConfig.order;
        const index = order.indexOf(contentSetupSelected.category);
        moveArrayItem(order, index, direction === 'up' ? index - 1 : index + 1);
        saveCategoryConfig();
        renderCategoryMenuCards();
        renderContentManagementPanel();
        return;
    }

    const saveCategoryButton = target.closest('[data-content-save-category]');
    if (saveCategoryButton && contentSetupSelected?.type === 'category') {
        const category = contentSetupSelected.category;
        const labelInput = document.getElementById('contentCategoryLabel');
        const hiddenInput = document.getElementById('contentCategoryHidden');
        categoryConfig.categories[category] = categoryConfig.categories[category] || {};
        const label = String(labelInput?.value || getCategoryMeta(category).label || category).trim();
        categoryConfig.categories[category].label = label || getCategoryMeta(category).label || category;
        categoryConfig.categories[category].hidden = Boolean(hiddenInput?.checked);
        if (!getCategoryOrder({ includeHidden: false }).length) {
            categoryConfig.categories[category].hidden = false;
            showToast('At least one section must remain visible.', 'warning');
        }
        saveCategoryConfig();
        saveDataToStorage();
        renderCategoryMenuCards();
        renderContentManagementPanel();
        showToast('Section saved', 'success');
        return;
    }

    const movePhraseButton = target.closest('[data-content-move-phrase]');
    if (movePhraseButton && contentSetupSelected?.type === 'phrase') {
        const phrases = buttonData[contentSetupSelected.category] || [];
        const index = phrases.findIndex(item => item.id === contentSetupSelected.phraseId);
        const direction = movePhraseButton.dataset.contentMovePhrase;
        moveArrayItem(phrases, index, direction === 'up' ? index - 1 : index + 1);
        saveDataToStorage();
        if (currentViewCategory === contentSetupSelected.category) populateGrid(contentSetupSelected.category);
        renderContentManagementPanel();
        return;
    }

    const savePhraseButton = target.closest('[data-content-save-phrase]');
    if (savePhraseButton && contentSetupSelected?.type === 'phrase') {
        const phrase = findPhraseById(contentSetupSelected.category, contentSetupSelected.phraseId);
        if (!phrase) return;
        const textInput = document.getElementById('contentPhraseText');
        const iconInput = document.getElementById('contentPhraseIcon');
        const hiddenInput = document.getElementById('contentPhraseHidden');
        const newText = String(textInput?.value || '').trim();
        if (!newText) {
            showToast('Phrase text cannot be blank.', 'warning');
            return;
        }
        phrase.text = newText;
        const icon = String(iconInput?.value || '').trim();
        if (icon) phrase.icon = icon;
        else delete phrase.icon;
        phrase.hidden = Boolean(hiddenInput?.checked);
        saveDataToStorage();
        if (currentViewCategory === contentSetupSelected.category) populateGrid(contentSetupSelected.category);
        renderContentManagementPanel();
        showToast('Phrase saved', 'success');
        return;
    }

    const deletePhraseButton = target.closest('[data-content-delete-phrase]');
    if (deletePhraseButton && contentSetupSelected?.type === 'phrase') {
        const phrases = buttonData[contentSetupSelected.category] || [];
        const index = phrases.findIndex(item => item.id === contentSetupSelected.phraseId);
        if (index < 0) return;
        if (!confirm('Delete this phrase permanently? Hiding is usually safer.')) return;
        phrases.splice(index, 1);
        saveDataToStorage();
        contentSetupSelected = { type: 'category', category: contentSetupSelected.category };
        if (currentViewCategory === contentSetupSelected.category) populateGrid(contentSetupSelected.category);
        renderContentManagementPanel();
        showToast('Phrase deleted', 'success');
        return;
    }

    if (target.closest('[data-content-add-phrase]')) {
        const category = contentSetupPhraseCategory;
        const text = String(document.getElementById('contentAddPhraseText')?.value || '').trim();
        const icon = String(document.getElementById('contentAddPhraseIcon')?.value || '').trim();
        if (!text) {
            showToast('Enter the phrase text first.', 'warning');
            return;
        }
        if (!buttonData[category]) buttonData[category] = [];
        const id = generateNextPhraseId(category);
        const phrase = { text, image: `${id}.jpg`, id };
        if (icon) phrase.icon = icon;
        buttonData[category].push(phrase);
        saveDataToStorage();
        contentSetupPhraseCategory = category;
        contentSetupSelected = { type: 'phrase', category, phraseId: id };
        if (currentViewCategory === category) populateGrid(category);
        renderContentManagementPanel();
        showToast(`Phrase added. Photo filename: ${id}.jpg`, 'success');
        return;
    }

    if (target.closest('[data-content-export]')) {
        exportButtonData();
        return;
    }

    if (target.closest('[data-content-import]')) {
        const input = document.getElementById('contentImportFile');
        if (input) input.click();
        return;
    }

    if (target.closest('[data-content-reset]')) {
        resetToDefaultData();
    }
}

function handleContentManagementChange(event) {
    const inlineCategoryLabel = event.target && event.target.getAttribute('data-content-inline-category-label');
    if (inlineCategoryLabel) {
        categoryConfig.categories[inlineCategoryLabel] = categoryConfig.categories[inlineCategoryLabel] || {};
        categoryConfig.categories[inlineCategoryLabel].label = String(event.target.value || '').trim() || getCategoryMeta(inlineCategoryLabel).label || inlineCategoryLabel;
        saveCategoryConfig();
        saveDataToStorage();
        renderCategoryMenuCards();
        return;
    }

    const inlineCategoryIcon = event.target && event.target.getAttribute('data-content-inline-category-icon');
    if (inlineCategoryIcon) {
        categoryConfig.categories[inlineCategoryIcon] = categoryConfig.categories[inlineCategoryIcon] || {};
        const icon = String(event.target.value || '').trim();
        if (icon) categoryConfig.categories[inlineCategoryIcon].icon = icon;
        else delete categoryConfig.categories[inlineCategoryIcon].icon;
        saveCategoryConfig();
        saveDataToStorage();
        renderCategoryMenuCards();
        return;
    }

    const inlineCategoryHidden = event.target && event.target.getAttribute('data-content-inline-category-hidden');
    if (inlineCategoryHidden) {
        categoryConfig.categories[inlineCategoryHidden] = categoryConfig.categories[inlineCategoryHidden] || {};
        categoryConfig.categories[inlineCategoryHidden].hidden = Boolean(event.target.checked);
        if (!getCategoryOrder({ includeHidden: false }).length) {
            categoryConfig.categories[inlineCategoryHidden].hidden = false;
            event.target.checked = false;
            showToast('At least one section must remain visible.', 'warning');
        }
        saveCategoryConfig();
        saveDataToStorage();
        renderCategoryMenuCards();
        return;
    }

    const inlinePhraseId = event.target && event.target.getAttribute('data-content-inline-phrase-text');
    if (inlinePhraseId) {
        const category = event.target.dataset.category || contentSetupPhraseCategory;
        const phrase = findPhraseById(category, inlinePhraseId);
        if (phrase) {
            phrase.text = String(event.target.value || '').trim();
            saveDataToStorage();
            if (currentViewCategory === category) populateGrid(category);
        }
        return;
    }

    const inlinePhraseIcon = event.target && event.target.getAttribute('data-content-inline-phrase-icon');
    if (inlinePhraseIcon) {
        const category = event.target.dataset.category || contentSetupPhraseCategory;
        const phrase = findPhraseById(category, inlinePhraseIcon);
        if (phrase) {
            const icon = String(event.target.value || '').trim();
            if (icon) phrase.icon = icon;
            else delete phrase.icon;
            saveDataToStorage();
            if (currentViewCategory === category) populateGrid(category);
        }
        return;
    }

    const inlinePhraseHidden = event.target && event.target.getAttribute('data-content-inline-phrase-hidden');
    if (inlinePhraseHidden) {
        const category = event.target.dataset.category || contentSetupPhraseCategory;
        const phrase = findPhraseById(category, inlinePhraseHidden);
        if (phrase) {
            phrase.hidden = Boolean(event.target.checked);
            saveDataToStorage();
            if (currentViewCategory === category) populateGrid(category);
        }
        return;
    }

    if (event.target && event.target.matches('[data-content-phrase-category]')) {
        contentSetupPhraseCategory = event.target.value;
        contentSetupSelected = { type: 'category', category: event.target.value };
        renderContentManagementPanel();
        return;
    }

    if (event.target && event.target.id === 'contentImportFile') {
        importContentBackup(event.target.files && event.target.files[0]);
        event.target.value = '';
    }
}

async function importContentBackup(file) {
    if (!file) return;
    try {
        const text = await file.text();
        const imported = JSON.parse(text);
        const nextButtonData = imported.buttonData || imported;
        if (!nextButtonData || typeof nextButtonData !== 'object') {
            showToast('This backup does not contain phrase data.', 'error');
            return;
        }
        if (!confirm('Replace the current phrase/menu content with this backup?')) return;

        buttonData = nextButtonData;
        categoryConfig = normaliseCategoryConfig(imported.categoryConfig || categoryConfig);
        saveCategoryConfig();
        saveDataToStorage();
        renderCategoryMenuCards();
        showMainMenu();
        renderContentManagementPanel();
        showToast('Content backup imported', 'success');
    } catch (error) {
        console.error(error);
        showToast('Import failed: invalid backup file.', 'error');
    }
}



// ============================================================================
// BUTTON DATA STRUCTURE
// ============================================================================

const defaultButtonData = {
    "quick": [
        {
            "text": "Yes",
            "image": "quick01.jpg",
            "id": "quick01"
        },
        {
            "text": "No",
            "image": "quick02.jpg",
            "id": "quick02"
        },
        {
            "text": "Maybe",
            "image": "quick03.jpg",
            "id": "quick03"
        },
        {
            "text": "I don't know",
            "image": "quick04.jpg",
            "id": "quick04"
        },
        {
            "text": "Please wait",
            "image": "quick05.jpg",
            "id": "quick05"
        },
        {
            "text": "Stop",
            "image": "quick06.jpg",
            "id": "quick06"
        },
        {
            "text": "Not that one",
            "image": "quick07.jpg",
            "id": "quick07"
        },
        {
            "text": "This one",
            "image": "quick08.jpg",
            "id": "quick08"
        },
        {
            "text": "I need help",
            "image": "quick09.jpg",
            "id": "quick09"
        },
        {
            "text": "Please speak slowly",
            "image": "quick10.jpg",
            "id": "quick10"
        },
        {
            "text": "Please write it down",
            "image": "quick11.jpg",
            "id": "quick11"
        },
        {
            "text": "Give me time",
            "image": "quick12.jpg",
            "id": "quick12"
        }
    ],
    "health": [
        {
            "text": "I need help now",
            "image": "health01.jpg",
            "id": "health01"
        },
        {
            "text": "This is urgent",
            "image": "health02.jpg",
            "id": "health02"
        },
        {
            "text": "I've fallen and need help",
            "image": "health03.jpg",
            "id": "health03"
        },
        {
            "text": "I'm having trouble breathing",
            "image": "health04.jpg",
            "id": "health04"
        },
        {
            "text": "I have chest pain",
            "image": "health05.jpg",
            "id": "health05"
        },
        {
            "text": "Please call an ambulance",
            "image": "health06.jpg",
            "id": "health06"
        },
        {
            "text": "Please call the nurse",
            "image": "health07.jpg",
            "id": "health07"
        },
        {
            "text": "I don't feel right",
            "image": "health08.jpg",
            "id": "health08"
        },
        {
            "text": "I feel sick",
            "image": "health09.jpg",
            "id": "health09"
        },
        {
            "text": "I feel dizzy",
            "image": "health10.jpg",
            "id": "health10"
        },
        {
            "text": "I feel like I might faint",
            "image": "health11.jpg",
            "id": "health11"
        },
        {
            "text": "I'm in pain",
            "image": "health12.jpg",
            "id": "health12"
        },
        {
            "text": "I need my pain medication",
            "image": "health13.jpg",
            "id": "health13"
        },
        {
            "text": "My back is hurting",
            "image": "health14.jpg",
            "id": "health14"
        },
        {
            "text": "My leg is cramping",
            "image": "health15.jpg",
            "id": "health15"
        },
        {
            "text": "Please check my blood pressure",
            "image": "health16.jpg",
            "id": "health16"
        },
        {
            "text": "I think I have a fever",
            "image": "health17.jpg",
            "id": "health17"
        },
        {
            "text": "Call my family immediately",
            "image": "health18.jpg",
            "id": "health18"
        }
    ],
    "selfcare": [
        {
            "text": "I need the toilet",
            "image": "selfcare01.jpg",
            "id": "selfcare01"
        },
        {
            "text": "I need to change position",
            "image": "selfcare02.jpg",
            "id": "selfcare02"
        },
        {
            "text": "I need my glasses",
            "image": "selfcare03.jpg",
            "id": "selfcare03"
        },
        {
            "text": "My hearing aid needs adjusting",
            "image": "selfcare04.jpg",
            "id": "selfcare04"
        },
        {
            "text": "Can you help me turn over?",
            "image": "selfcare05.jpg",
            "id": "selfcare05"
        },
        {
            "text": "Can you adjust my pillow?",
            "image": "selfcare06.jpg",
            "id": "selfcare06"
        },
        {
            "text": "I need my medication",
            "image": "selfcare07.jpg",
            "id": "selfcare07"
        },
        {
            "text": "I want to shower",
            "image": "selfcare08.jpg",
            "id": "selfcare08"
        },
        {
            "text": "I'd like to brush my teeth",
            "image": "selfcare09.jpg",
            "id": "selfcare09"
        },
        {
            "text": "I'd like to wash my face",
            "image": "selfcare10.jpg",
            "id": "selfcare10"
        },
        {
            "text": "I need to shave",
            "image": "selfcare11.jpg",
            "id": "selfcare11"
        },
        {
            "text": "Can you help me get dressed?",
            "image": "selfcare12.jpg",
            "id": "selfcare12"
        },
        {
            "text": "Can you help me with my shoes?",
            "image": "selfcare13.jpg",
            "id": "selfcare13"
        },
        {
            "text": "I'm ready for bed",
            "image": "selfcare14.jpg",
            "id": "selfcare14"
        },
        {
            "text": "I'm too hot",
            "image": "selfcare15.jpg",
            "id": "selfcare15"
        },
        {
            "text": "I'm too cold",
            "image": "selfcare16.jpg",
            "id": "selfcare16"
        },
        {
            "text": "My feet are cold",
            "image": "selfcare17.jpg",
            "id": "selfcare17"
        },
        {
            "text": "Could you fluff my pillows?",
            "image": "selfcare18.jpg",
            "id": "selfcare18"
        }
    ],
    "food": [
        {
            "text": "I'm thirsty",
            "image": "food01.jpg",
            "id": "food01"
        },
        {
            "text": "I'd like water please",
            "image": "food02.jpg",
            "id": "food02"
        },
        {
            "text": "I'm hungry",
            "image": "food03.jpg",
            "id": "food03"
        },
        {
            "text": "Can I have a snack?",
            "image": "food04.jpg",
            "id": "food04"
        },
        {
            "text": "What can I eat?",
            "image": "food05.jpg",
            "id": "food05"
        },
        {
            "text": "I'd like coffee please",
            "image": "food06.jpg",
            "id": "food06"
        },
        {
            "text": "I'd like a cup of tea",
            "image": "food07.jpg",
            "id": "food07"
        },
        {
            "text": "Could I have some toast?",
            "image": "food08.jpg",
            "id": "food08"
        },
        {
            "text": "I'd like soup please",
            "image": "food09.jpg",
            "id": "food09"
        },
        {
            "text": "I'm not hungry",
            "image": "food10.jpg",
            "id": "food10"
        },
        {
            "text": "I'm full",
            "image": "food11.jpg",
            "id": "food11"
        },
        {
            "text": "No more thank you",
            "image": "food12.jpg",
            "id": "food12"
        },
        {
            "text": "That was delicious",
            "image": "food13.jpg",
            "id": "food13"
        }
    ],
    "environment": [
        {
            "text": "I want to rest",
            "image": "comfort01.jpg",
            "id": "comfort01"
        },
        {
            "text": "I need privacy",
            "image": "comfort02.jpg",
            "id": "comfort02"
        },
        {
            "text": "Please close the door",
            "image": "comfort03.jpg",
            "id": "comfort03"
        },
        {
            "text": "It's too cold in here",
            "image": "comfort04.jpg",
            "id": "comfort04"
        },
        {
            "text": "It's too warm",
            "image": "comfort05.jpg",
            "id": "comfort05"
        },
        {
            "text": "The light is too bright",
            "image": "comfort06.jpg",
            "id": "comfort06"
        },
        {
            "text": "I need more light",
            "image": "comfort07.jpg",
            "id": "comfort07"
        },
        {
            "text": "This noise is bothering me",
            "image": "comfort08.jpg",
            "id": "comfort08"
        },
        {
            "text": "The TV is too loud",
            "image": "comfort09.jpg",
            "id": "comfort09"
        },
        {
            "text": "Please open the window",
            "image": "comfort10.jpg",
            "id": "comfort10"
        },
        {
            "text": "Please close the window",
            "image": "comfort11.jpg",
            "id": "comfort11"
        },
        {
            "text": "Can you close the curtains?",
            "image": "comfort12.jpg",
            "id": "comfort12"
        },
        {
            "text": "The room is too stuffy",
            "image": "comfort13.jpg",
            "id": "comfort13"
        },
        {
            "text": "Can you turn on the fan?",
            "image": "comfort14.jpg",
            "id": "comfort14"
        },
        {
            "text": "I need fresh air",
            "image": "comfort15.jpg",
            "id": "comfort15"
        },
        {
            "text": "Please move this closer",
            "image": "comfort16.jpg",
            "id": "comfort16"
        },
        {
            "text": "Please move this away",
            "image": "comfort17.jpg",
            "id": "comfort17"
        },
        {
            "text": "Could you adjust my chair?",
            "image": "comfort18.jpg",
            "id": "comfort18"
        },
        {
            "text": "I'd like to sit outside",
            "image": "comfort19.jpg",
            "id": "comfort19"
        }
    ],
    "MyPeople": [
        {
            "id": "people01",
            "text": "Person 1",
            "image": "people01.jpg",
            "relationship": "Family member",
            "occupation": "",
            "location": "",
            "birthday": "",
            "phone": "",
            "detailedIntro": "This is Person 1.",
            "family": "",
            "hobbies": "",
            "additionalInfo": ""
        },
        {
            "id": "people02",
            "text": "Person 2",
            "image": "people02.jpg",
            "relationship": "Family member",
            "occupation": "",
            "location": "",
            "birthday": "",
            "phone": "",
            "detailedIntro": "This is Person 2.",
            "family": "",
            "hobbies": "",
            "additionalInfo": ""
        },
        {
            "id": "people03",
            "text": "Person 3",
            "image": "people03.jpg",
            "relationship": "Friend",
            "occupation": "",
            "location": "",
            "birthday": "",
            "phone": "",
            "detailedIntro": "This is Person 3.",
            "family": "",
            "hobbies": "",
            "additionalInfo": ""
        },
        {
            "id": "people04",
            "text": "Person 4",
            "image": "people04.jpg",
            "relationship": "Friend",
            "occupation": "",
            "location": "",
            "birthday": "",
            "phone": "",
            "detailedIntro": "This is Person 4.",
            "family": "",
            "hobbies": "",
            "additionalInfo": ""
        },
        {
            "id": "people05",
            "text": "Person 5",
            "image": "people05.jpg",
            "relationship": "Care contact",
            "occupation": "",
            "location": "",
            "birthday": "",
            "phone": "",
            "detailedIntro": "This is Person 5.",
            "family": "",
            "hobbies": "",
            "additionalInfo": ""
        },
        {
            "id": "people06",
            "text": "Person 6",
            "image": "people06.jpg",
            "relationship": "Visitor",
            "occupation": "",
            "location": "",
            "birthday": "",
            "phone": "",
            "detailedIntro": "This is Person 6.",
            "family": "",
            "hobbies": "",
            "additionalInfo": ""
        }
    ],
    "feelings": [
        {
            "text": "I'm in pain",
            "image": "feelings01.jpg",
            "id": "feelings01"
        },
        {
            "text": "I'm scared",
            "image": "feelings02.jpg",
            "id": "feelings02"
        },
        {
            "text": "I'm worried",
            "image": "feelings03.jpg",
            "id": "feelings03"
        },
        {
            "text": "I'm confused",
            "image": "feelings04.jpg",
            "id": "feelings04"
        },
        {
            "text": "I feel overwhelmed",
            "image": "feelings05.jpg",
            "id": "feelings05"
        },
        {
            "text": "I need quiet",
            "image": "feelings06.jpg",
            "id": "feelings06"
        },
        {
            "text": "I need reassurance",
            "image": "feelings07.jpg",
            "id": "feelings07"
        },
        {
            "text": "I'm sad",
            "image": "feelings08.jpg",
            "id": "feelings08"
        },
        {
            "text": "I'm happy",
            "image": "feelings09.jpg",
            "id": "feelings09"
        },
        {
            "text": "I'm tired",
            "image": "feelings10.jpg",
            "id": "feelings10"
        },
        {
            "text": "I'm frustrated",
            "image": "feelings11.jpg",
            "id": "feelings11"
        },
        {
            "text": "I need a hug",
            "image": "feelings12.jpg",
            "id": "feelings12"
        },
        {
            "text": "I'm comfortable",
            "image": "feelings13.jpg",
            "id": "feelings13"
        },
        {
            "text": "I feel great today",
            "image": "feelings14.jpg",
            "id": "feelings14"
        }
    ],
    "routine": [
        {
            "text": "What is happening next?",
            "image": "routine01.jpg",
            "id": "routine01"
        },
        {
            "text": "Who is looking after me today?",
            "image": "routine02.jpg",
            "id": "routine02"
        },
        {
            "text": "What day is it today?",
            "image": "routine03.jpg",
            "id": "routine03"
        },
        {
            "text": "What's happening today?",
            "image": "routine04.jpg",
            "id": "routine04"
        },
        {
            "text": "Who is visiting today?",
            "image": "routine05.jpg",
            "id": "routine05"
        },
        {
            "text": "Am I going somewhere today?",
            "image": "routine06.jpg",
            "id": "routine06"
        },
        {
            "text": "When are we leaving?",
            "image": "routine07.jpg",
            "id": "routine07"
        },
        {
            "text": "What time is my appointment?",
            "image": "routine08.jpg",
            "id": "routine08"
        },
        {
            "text": "Is it time for my medication?",
            "image": "routine09.jpg",
            "id": "routine09"
        },
        {
            "text": "What's for breakfast?",
            "image": "routine10.jpg",
            "id": "routine10"
        },
        {
            "text": "What's the weather like?",
            "image": "routine11.jpg",
            "id": "routine11"
        },
        {
            "text": "What's the plan for this afternoon?",
            "image": "routine12.jpg",
            "id": "routine12"
        },
        {
            "text": "What time are you coming tomorrow?",
            "image": "routine13.jpg",
            "id": "routine13"
        }
    ],
    "social": [
        {
            "text": "Please slow down",
            "image": "social01.jpg",
            "id": "social01"
        },
        {
            "text": "Please say that again",
            "image": "social02.jpg",
            "id": "social02"
        },
        {
            "text": "Please write it down",
            "image": "social03.jpg",
            "id": "social03"
        },
        {
            "text": "Give me time",
            "image": "social04.jpg",
            "id": "social04"
        },
        {
            "text": "I know what I mean",
            "image": "social05.jpg",
            "id": "social05"
        },
        {
            "text": "I can't get the words out",
            "image": "social06.jpg",
            "id": "social06"
        },
        {
            "text": "I don't understand",
            "image": "social07.jpg",
            "id": "social07"
        },
        {
            "text": "Could you repeat that?",
            "image": "social08.jpg",
            "id": "social08"
        },
        {
            "text": "Thank you for helping me",
            "image": "social09.jpg",
            "id": "social09"
        },
        {
            "text": "You're very kind",
            "image": "social10.jpg",
            "id": "social10"
        },
        {
            "text": "I'd like some company",
            "image": "social11.jpg",
            "id": "social11"
        },
        {
            "text": "I'm feeling lonely",
            "image": "social12.jpg",
            "id": "social12"
        },
        {
            "text": "Could you help me make a phone call?",
            "image": "social13.jpg",
            "id": "social13"
        },
        {
            "text": "How are you today?",
            "image": "social14.jpg",
            "id": "social14"
        },
        {
            "text": "Tell me about your day",
            "image": "social15.jpg",
            "id": "social15"
        },
        {
            "text": "Let's talk about the family",
            "image": "social16.jpg",
            "id": "social16"
        },
        {
            "text": "That's interesting",
            "image": "social17.jpg",
            "id": "social17"
        }
    ],
    "activities": [
        {
            "text": "I'd like to watch TV",
            "image": "activities01.jpg",
            "id": "activities01"
        },
        {
            "text": "Can we go for a walk?",
            "image": "activities02.jpg",
            "id": "activities02"
        },
        {
            "text": "I want to listen to music",
            "image": "activities03.jpg",
            "id": "activities03"
        },
        {
            "text": "I'd like to look at photos",
            "image": "activities04.jpg",
            "id": "activities04"
        },
        {
            "text": "I'd like to read",
            "image": "activities05.jpg",
            "id": "activities05"
        },
        {
            "text": "Can we play a game?",
            "image": "activities06.jpg",
            "id": "activities06"
        },
        {
            "text": "I want to exercise",
            "image": "activities07.jpg",
            "id": "activities07"
        },
        {
            "text": "Let's sit in the garden",
            "image": "activities08.jpg",
            "id": "activities08"
        },
        {
            "text": "I'd like to watch the news",
            "image": "activities09.jpg",
            "id": "activities09"
        },
        {
            "text": "I'd like to listen to the radio",
            "image": "activities10.jpg",
            "id": "activities10"
        },
        {
            "text": "Can we watch a movie?",
            "image": "activities11.jpg",
            "id": "activities11"
        },
        {
            "text": "Let's watch the cricket",
            "image": "activities12.jpg",
            "id": "activities12"
        },
        {
            "text": "Let's talk about rugby",
            "image": "activities13.jpg",
            "id": "activities13"
        },
        {
            "text": "I'd like to do a puzzle",
            "image": "activities14.jpg",
            "id": "activities14"
        }
    ],
    "memories": [
        {
            "text": "I'd like to talk about when we lived in...",
            "image": "memories01.jpg",
            "id": "memories01"
        },
        {
            "text": "I'd like to talk about our holiday",
            "image": "memories02.jpg",
            "id": "memories02"
        },
        {
            "text": "I'd like to talk about my childhood",
            "image": "memories03.jpg",
            "id": "memories03"
        },
        {
            "text": "I'd like to talk about when the children were little",
            "image": "memories04.jpg",
            "id": "memories04"
        },
        {
            "text": "I'd like to talk about our wedding day",
            "image": "memories05.jpg",
            "id": "memories05"
        },
        {
            "text": "I'd like to talk about my first job",
            "image": "memories06.jpg",
            "id": "memories06"
        },
        {
            "text": "I'd like to talk about my school days",
            "image": "memories07.jpg",
            "id": "memories07"
        },
        {
            "text": "Let's talk about our favourite restaurant",
            "image": "memories08.jpg",
            "id": "memories08"
        },
        {
            "text": "I'd like to look at old photos",
            "image": "memories09.jpg",
            "id": "memories09"
        }
    ]
};

// Initialize buttonData with defaults. Saved local data is loaded during DOMContentLoaded.
let buttonData = JSON.parse(JSON.stringify(defaultButtonData));

// ============================================================================
// MAIN APP FUNCTIONS
// ============================================================================


function getCategoryMeta(category) {
    const base = CATEGORY_META[category] || makeFallbackCategoryMeta(category);
    const configured = getCategoryConfigEntry(category);
    return {
        ...base,
        ...configured,
        label: configured.label || base.label || category,
        hidden: Boolean(configured.hidden)
    };
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, function(char) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char];
    });
}

function setMessageBarText(text) {
    const messageBar = document.getElementById('messageBar');
    if (!messageBar) return;
    const messageText = document.getElementById('messageBarText') || messageBar.querySelector('p');
    if (messageText) {
        messageText.hidden = false;
        messageText.textContent = text || MAIN_MENU_PROMPT;
    }
    const introButton = document.getElementById('introductionHeaderButton');
    if (introButton) introButton.hidden = true;
}

function getFallbackIcon(category, text = '') {
    const lower = String(text).toLowerCase();
    const keywordIcons = [
        [/^yes$/, '✅'],
        [/^no$/, '❌'],
        [/maybe|don't know|not sure/, '❔'],
        [/stop|urgent|help now|immediately/, '🛑'],
        [/wait|slowly|write it down|give me time|not that|this one/, '✋'],
        [/water|drink|thirsty|tea|coffee/, '🥤'],
        [/hungry|snack|toast|soup|meal|breakfast|delicious|full|eat/, '🍽️'],
        [/happy|great/, '😊'],
        [/sad|lonely|worried|scared|confused|overwhelmed|reassurance|quiet/, '😔'],
        [/tired|bed|rest/, '😴'],
        [/pain|hurt|medication|nurse|doctor|blood pressure|fever|breath|dizzy|fallen|chest|ambulance|sick|faint|right/, '❤️'],
        [/toilet|bathroom|shower|wash|brush|teeth|shave|dressed|pillow|glasses|hearing aid|shoes|position|turn over/, '🧼'],
        [/time|today|tomorrow|appointment|weather|plan|schedule|happening|visiting|leaving/, '🕒'],
        [/how are|thank|repeat|understand|phone|talk|company|slow down|say that again|words out|family/, '💬'],
        [/tv|music|radio|movie|cricket|rugby|puzzle|photos|news/, '🎵'],
        [/walk|exercise|garden|outside|game/, '🚶'],
        [/remember|childhood|holiday|school|wedding|first job|restaurant|old photos/, '📷'],
        [/cold|warm|window|curtain|light|noise|quiet|stuffy|fan|fresh air|chair|privacy|door|closer|away/, '🛋️']
    ];

    for (const [pattern, icon] of keywordIcons) {
        if (pattern.test(lower)) return icon;
    }

    return getCategoryMeta(category).icon;
}

function getImagePath(category, imageFile) {
    if (!imageFile) return '';
    return `images/${category}/${imageFile}`;
}

function getMenuImagePath(category) {
    const meta = getCategoryMeta(category);
    return `${MENU_IMAGE_FOLDER}/${meta.menuImage || `${meta.prefix}.jpg`}`;
}

function getCurrentCategory(fallback = 'food') {
    const grid = document.getElementById('buttonGrid');
    if (grid && grid.dataset.category) return grid.dataset.category;
    const activeTab = document.querySelector('.tab.active');
    if (activeTab && activeTab.dataset.category) return activeTab.dataset.category;
    return fallback;
}

function renderCategoryMenuCards() {
    const menu = document.querySelector('.tab-container');
    if (!menu) return;

    const visibleCategories = getCategoryOrder({ includeHidden: false });
    menu.innerHTML = '';

    if (!visibleCategories.length) {
        const warning = document.createElement('p');
        warning.className = 'empty-menu-warning';
        warning.textContent = 'No visible communication sections. Open Content Management to show at least one section.';
        menu.appendChild(warning);
        return;
    }

    visibleCategories.forEach(category => {
        const meta = getCategoryMeta(category);
        const imagePath = getMenuImagePath(category);
        const tab = document.createElement('button');
        tab.className = 'tab';
        tab.type = 'button';
        tab.dataset.category = category;
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-selected', 'false');
        tab.setAttribute('aria-label', meta.label);
        tab.style.setProperty('--tab-color', meta.colour);
        tab.style.setProperty('--tab-dark', meta.dark);
        tab.style.setProperty('--tab-soft', meta.soft);
        tab.innerHTML = `
            <span class="menu-card-title">${escapeHtml(meta.label)}</span>
            <span class="menu-card-image-shell">
                <img src="${escapeHtml(imagePath)}" alt="${escapeHtml(meta.label)}" loading="lazy" data-private-media-key="${escapeHtml(getPrivateMediaKey('menu', category))}" onload="this.classList.add('loaded'); this.nextElementSibling.hidden=true;" onerror="this.style.display='none'; this.nextElementSibling.hidden=false;">
                <span class="menu-card-fallback" aria-hidden="true">${meta.icon}</span>
            </span>
        `;
        tab.addEventListener('click', () => showCategorySubmenu(category));
        menu.appendChild(tab);

        const img = tab.querySelector('img[data-private-media-key]');
        const fallback = tab.querySelector('.menu-card-fallback');
        applyPrivateImageToElement(img, getPrivateMediaKey('menu', category), fallback);
    });
}

function showMainMenu() {
    const menu = document.querySelector('.tab-container');
    const header = document.getElementById('submenuHeader');
    const grid = document.getElementById('buttonGrid');
    const messageBar = document.getElementById('messageBar');
    const backToMenu = document.getElementById('backToMenu');

    currentViewCategory = null;
    document.body.classList.remove('submenu-open');
    setMessageBarText(MAIN_MENU_PROMPT);

    if (messageBar) messageBar.classList.remove('submenu-titlebar');
    if (backToMenu) backToMenu.hidden = true;
    if (header) header.hidden = true;

    if (appSettings.displayMode === 'simple-list') {
        if (menu) menu.hidden = true;
        if (grid) {
            grid.hidden = false;
            renderSimpleVocabularyView(grid);
        }
    } else {
        renderCategoryMenuCards();
        if (menu) menu.hidden = false;
        if (grid) {
            grid.hidden = true;
            grid.innerHTML = '';
            grid.classList.remove('simple-vocabulary-list');
            grid.removeAttribute('data-view');
            grid.removeAttribute('data-category');
        }
    }

    renderIntroductionHeaderButton();

    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
    });
}

function showCategorySubmenu(category) {
    const menu = document.querySelector('.tab-container');
    const header = document.getElementById('submenuHeader');
    const grid = document.getElementById('buttonGrid');
    const messageBar = document.getElementById('messageBar');
    const backToMenu = document.getElementById('backToMenu');
    const meta = getCategoryMeta(category);

    currentViewCategory = category;
    document.body.classList.add('submenu-open');
    setMessageBarText(meta.label);
    hideIntroductionHeaderButton();

    if (messageBar) messageBar.classList.add('submenu-titlebar');
    if (backToMenu) backToMenu.hidden = false;
    if (menu) menu.hidden = true;
    if (header) header.hidden = true;
    if (grid) {
        grid.hidden = false;
        grid.classList.remove('simple-vocabulary-list');
        grid.removeAttribute('data-view');
    }

    document.querySelectorAll('.tab').forEach(tab => {
        const isActive = tab.getAttribute('data-category') === category;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    populateGrid(category);
}

function createButtonMediaHTML(buttonInfo, category, extraClass = '') {
    const imagePath = getImagePath(category, buttonInfo.image);
    const icon = buttonInfo.icon || getFallbackIcon(category, buttonInfo.text);
    const safeAlt = escapeHtml(buttonInfo.text || getCategoryMeta(category).label);
    const privateKey = getPrivateMediaKey('phrase', buttonInfo);
    const safeSrc = imagePath ? `src="${escapeHtml(imagePath)}"` : '';
    const initialStyle = imagePath ? '' : 'style="display:none;"';

    return `
        <div class="button-media ${extraClass}">
            <img ${safeSrc} ${initialStyle} alt="${safeAlt}" loading="lazy" data-private-media-key="${escapeHtml(privateKey)}" onload="this.classList.add('loaded'); this.nextElementSibling.style.display='none';" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <span class="button-fallback-icon" aria-hidden="true">${icon}</span>
        </div>
    `;
}

function applyCategoryTheme(category) {
    const meta = getCategoryMeta(category);
    const root = document.documentElement;
    root.style.setProperty('--category-color', meta.colour);
    root.style.setProperty('--category-dark', meta.dark);
    root.style.setProperty('--category-soft', meta.soft);

    const grid = document.getElementById('buttonGrid');
    if (grid) grid.setAttribute('data-category', category);

    document.querySelectorAll('.tab').forEach(tab => {
        const tabMeta = getCategoryMeta(tab.getAttribute('data-category'));
        tab.style.setProperty('--tab-color', tabMeta.colour);
        tab.style.setProperty('--tab-dark', tabMeta.dark);
        tab.style.setProperty('--tab-soft', tabMeta.soft);
    });
}



function applyCategoryThemeToElement(element, category) {
    const meta = getCategoryMeta(category);
    if (!element) return;
    element.style.setProperty('--category-color', meta.colour);
    element.style.setProperty('--category-dark', meta.dark);
    element.style.setProperty('--category-soft', meta.soft);
}

function createPhraseButton(buttonInfo, category) {
    const phraseForClick = { ...buttonInfo, category };
    const button = document.createElement('button');
    button.className = 'grid-button';
    button.dataset.category = category;
    if (buttonInfo.id) button.dataset.phraseId = buttonInfo.id;
    applyCategoryThemeToElement(button, category);

    const safeText = escapeHtml(buttonInfo.text || '');

    if (category === 'MyPeople' && buttonInfo.relationship) {
        const countdown = getBirthdayCountdown(buttonInfo.birthday);
        const hasBirthdaySoon = buttonInfo.birthday && countdown !== '';
        const safeRelationship = escapeHtml(buttonInfo.relationship || '');
        const safeOccupation = escapeHtml(buttonInfo.occupation || '');
        const safeCountdown = escapeHtml(countdown || '');

        button.innerHTML = `
            ${createButtonMediaHTML(buttonInfo, category, 'person-button-media')}
            <span>${safeText}</span>
            <div class="person-details">
                <small>${safeRelationship}</small>
                ${buttonInfo.occupation ? `<small class="occupation">${safeOccupation}</small>` : ''}
                ${hasBirthdaySoon ? `<small class="countdown">🎂 ${safeCountdown}</small>` : ''}
            </div>
        `;
    } else {
        button.innerHTML = `
            ${createButtonMediaHTML(buttonInfo, category)}
            <span>${safeText}</span>
        `;
    }

    attachPhraseActivation(button, phraseForClick);
    applyPrivateImagesIn(button);
    return button;
}

function renderSimpleVocabularyView(grid) {
    if (!grid) return;
    grid.innerHTML = '';
    grid.removeAttribute('data-category');
    grid.dataset.view = 'simple-list';
    grid.classList.add('simple-vocabulary-list');

    const categories = getCategoryOrder({ includeHidden: false });
    let visiblePhraseCount = 0;

    categories.forEach(category => {
        const phrases = getDisplayPhrases(category);
        if (!phrases.length) return;
        const meta = getCategoryMeta(category);
        const heading = document.createElement('div');
        heading.className = 'simple-vocabulary-heading';
        heading.style.setProperty('--category-color', meta.colour);
        heading.style.setProperty('--category-dark', meta.dark);
        heading.style.setProperty('--category-soft', meta.soft);
        heading.innerHTML = `<span class="simple-heading-icon" aria-hidden="true">${escapeHtml(meta.icon)}</span><span>${escapeHtml(meta.label)}</span>`;
        grid.appendChild(heading);

        phrases.forEach(buttonInfo => {
            grid.appendChild(createPhraseButton(buttonInfo, category));
            visiblePhraseCount += 1;
        });
    });

    if (!visiblePhraseCount) {
        const empty = document.createElement('p');
        empty.className = 'empty-category-message';
        empty.textContent = 'No visible phrases are available.';
        grid.appendChild(empty);
    }
}

function populateGrid(category) {
    const grid = document.getElementById('buttonGrid');
    grid.innerHTML = '';
    applyCategoryTheme(category);

    const buttons = getDisplayPhrases(category);

    if (!buttonData[category]) {
        grid.innerHTML = '<p>Category not found.</p>';
        return;
    }

    if (!buttons.length) {
        grid.innerHTML = '<p class="empty-category-message">No visible phrases in this section.</p>';
        return;
    }

    grid.removeAttribute('data-view');
    grid.classList.remove('simple-vocabulary-list');

    buttons.forEach(buttonInfo => {
        grid.appendChild(createPhraseButton(buttonInfo, category));
    });

    // === ACCESSIBILITY: KEYBOARD NAVIGATION ===
    const gridButtons = grid.querySelectorAll('.grid-button');
    gridButtons.forEach(btn => btn.setAttribute('tabindex', '0'));
}

function getZoomImageCandidates(buttonInfo) {
    if (!buttonInfo) return [];

    const explicitZoomImage = String(buttonInfo.zoomImage || '').trim();
    if (explicitZoomImage) {
        if (explicitZoomImage.includes('/')) return [explicitZoomImage];
        return [`${ZOOM_IMAGE_FOLDER}/${explicitZoomImage}`];
    }

    const baseId = String(buttonInfo.id || '').trim();
    if (!baseId) return [];

    return ZOOM_IMAGE_EXTENSIONS.map(ext => `${ZOOM_IMAGE_FOLDER}/${baseId}.${ext}`);
}

function getZoomOverlay() {
    let overlay = document.getElementById('zoomImageOverlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'zoomImageOverlay';
    overlay.className = 'zoom-image-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Selected phrase image');
    overlay.innerHTML = `
        <div class="zoom-image-card">
            <img class="zoom-image" alt="" decoding="async">
            <div class="zoom-image-caption"></div>
        </div>
    `;

    overlay.addEventListener('click', hideZoomImage);
    document.body.appendChild(overlay);
    return overlay;
}

function hideZoomImage() {
    if (zoomImageTimer) {
        clearTimeout(zoomImageTimer);
        zoomImageTimer = null;
    }

    const overlay = document.getElementById('zoomImageOverlay');
    if (!overlay) return;
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
}

async function showZoomImageForPhrase(buttonInfo) {
    if (!buttonInfo) return;

    const overlay = getZoomOverlay();
    const img = overlay.querySelector('.zoom-image');
    const caption = overlay.querySelector('.zoom-image-caption');
    if (!img || !caption) return;

    const safeText = String(buttonInfo.text || '');

    const showSource = (source) => {
        img.onload = () => {
            img.onload = null;
            img.onerror = null;
            caption.textContent = safeText;
            overlay.classList.add('show');
            overlay.setAttribute('aria-hidden', 'false');

            if (zoomImageTimer) clearTimeout(zoomImageTimer);
            zoomImageTimer = setTimeout(hideZoomImage, 4000);
        };
        img.onerror = () => {
            img.onload = null;
            img.onerror = null;
        };
        img.src = source;
        img.alt = safeText ? `Image for ${safeText}` : 'Selected phrase image';
    };

    const localPhraseUrl = await getPrivateMediaObjectUrl(getPrivateMediaKey('phrase', buttonInfo));
    if (localPhraseUrl) {
        showSource(localPhraseUrl);
        return;
    }

    // v16: phrase popups use the same phrase picture shown beside the text.
    // Legacy zoom images are kept as a fallback only for older existing setups.
    const localZoomUrl = await getPrivateMediaObjectUrl(getPrivateMediaKey('zoom', buttonInfo));
    if (localZoomUrl) {
        showSource(localZoomUrl);
        return;
    }

    const candidates = [...getPhraseImageCandidates(buttonInfo), ...getZoomImageCandidates(buttonInfo)];
    if (!candidates.length) return;

    let index = 0;
    const tryNextImage = () => {
        if (index >= candidates.length) {
            img.onload = null;
            img.onerror = null;
            img.removeAttribute('src');
            return;
        }

        const candidate = candidates[index++];
        img.onload = () => {
            img.onload = null;
            img.onerror = null;
            caption.textContent = safeText;
            overlay.classList.add('show');
            overlay.setAttribute('aria-hidden', 'false');

            if (zoomImageTimer) clearTimeout(zoomImageTimer);
            zoomImageTimer = setTimeout(hideZoomImage, 4000);
        };
        img.onerror = tryNextImage;
        img.src = candidate;
        img.alt = safeText ? `Image for ${safeText}` : 'Selected phrase image';
    };

    tryNextImage();
}


function getPhraseImageCandidates(buttonInfo) {
    if (!buttonInfo) return [];
    const category = buttonInfo.category || findCategoryForPhraseId(buttonInfo.id);
    if (!category) return [];
    const explicitImage = String(buttonInfo.image || '').trim();
    if (explicitImage) {
        if (explicitImage.includes('/')) return [explicitImage];
        return [getImagePath(category, explicitImage)];
    }
    const baseId = String(buttonInfo.id || '').trim();
    if (!baseId) return [];
    return ['jpg', 'jpeg', 'png', 'webp'].map(ext => `images/${category}/${baseId}.${ext}`);
}

function findCategoryForPhraseId(phraseId) {
    if (!phraseId) return '';
    for (const [category, phrases] of Object.entries(buttonData || {})) {
        if ((phrases || []).some(phrase => phrase && phrase.id === phraseId)) return category;
    }
    return '';
}

function getPhrasePopupOverlay() {
    let overlay = document.getElementById('phrasePopupOverlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'phrasePopupOverlay';
    overlay.className = 'phrase-popup-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Selected phrase');
    overlay.innerHTML = `
        <div class="phrase-popup-card">
            <div class="phrase-popup-image-shell" hidden>
                <img class="phrase-popup-image" alt="" decoding="async">
            </div>
            <div class="phrase-popup-text" aria-live="assertive"></div>
        </div>
    `;

    document.body.appendChild(overlay);
    return overlay;
}

function hidePhrasePopup(token = null) {
    if (token && token !== phrasePopupToken) return;
    if (phrasePopupTimer) {
        clearTimeout(phrasePopupTimer);
        phrasePopupTimer = null;
    }

    const overlay = document.getElementById('phrasePopupOverlay');
    if (!overlay) return;

    const image = overlay.querySelector('.phrase-popup-image');
    const imageShell = overlay.querySelector('.phrase-popup-image-shell');
    if (image) {
        image.onload = null;
        image.onerror = null;
        image.removeAttribute('src');
        image.alt = '';
    }
    if (imageShell) imageShell.hidden = true;

    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
}

function closePhrasePopupAfterMinimum(token) {
    if (token && token !== phrasePopupToken) return;
    if (phrasePopupTimer) clearTimeout(phrasePopupTimer);
    phrasePopupTimer = setTimeout(() => hidePhrasePopup(token), getPopupCloseDelayMs());
}

function showPhrasePopup(buttonInfoOrText) {
    const buttonInfo = typeof buttonInfoOrText === 'object' && buttonInfoOrText !== null ? buttonInfoOrText : null;
    const text = buttonInfo ? String(buttonInfo.text || '') : String(buttonInfoOrText || '');
    const overlay = getPhrasePopupOverlay();
    const textElement = overlay.querySelector('.phrase-popup-text');
    const image = overlay.querySelector('.phrase-popup-image');
    const imageShell = overlay.querySelector('.phrase-popup-image-shell');

    phrasePopupToken += 1;
    const token = phrasePopupToken;
    phrasePopupMinimumCloseTime = Date.now();
    if (phrasePopupTimer) clearTimeout(phrasePopupTimer);

    if (textElement) textElement.textContent = text;
    if (imageShell) imageShell.hidden = true;
    if (image) {
        image.onload = null;
        image.onerror = null;
        image.removeAttribute('src');
        image.alt = '';
    }

    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');

    if (buttonInfo) applyPhrasePopupZoomImage(buttonInfo, token);

    // Safety close if a browser fails to fire audio/speech completion events.
    phrasePopupTimer = setTimeout(() => hidePhrasePopup(token), 15000);
    return token;
}

async function applyPhrasePopupZoomImage(buttonInfo, token) {
    if (!buttonInfo || token !== phrasePopupToken) return;

    const overlay = getPhrasePopupOverlay();
    const image = overlay.querySelector('.phrase-popup-image');
    const imageShell = overlay.querySelector('.phrase-popup-image-shell');
    if (!image || !imageShell) return;

    const safeText = String(buttonInfo.text || '');

    const showSource = (source) => {
        if (token !== phrasePopupToken) return;
        image.onload = () => {
            if (token !== phrasePopupToken) return;
            image.onload = null;
            image.onerror = null;
            image.alt = safeText ? `Image for ${safeText}` : 'Selected phrase image';
            imageShell.hidden = false;
        };
        image.onerror = () => {
            image.onload = null;
            image.onerror = null;
        };
        image.src = source;
    };

    if (buttonInfo.isIntroduction) {
        const introUrl = await getPrivateMediaObjectUrl(INTRODUCTION_IMAGE_KEY);
        if (introUrl) {
            showSource(introUrl);
            return;
        }
    }

    const localPhraseUrl = await getPrivateMediaObjectUrl(getPrivateMediaKey('phrase', buttonInfo));
    if (localPhraseUrl) {
        showSource(localPhraseUrl);
        return;
    }

    // v16: phrase popups use the same phrase picture shown beside the text.
    // Legacy zoom images are kept as a fallback only for older existing setups.
    const localZoomUrl = await getPrivateMediaObjectUrl(getPrivateMediaKey('zoom', buttonInfo));
    if (localZoomUrl) {
        showSource(localZoomUrl);
        return;
    }

    const candidates = [...getPhraseImageCandidates(buttonInfo), ...getZoomImageCandidates(buttonInfo)];
    if (!candidates.length) return;

    let index = 0;
    const tryNextImage = () => {
        if (token !== phrasePopupToken) return;
        if (index >= candidates.length) {
            image.onload = null;
            image.onerror = null;
            image.removeAttribute('src');
            return;
        }
        const candidate = candidates[index++];
        image.onload = () => {
            if (token !== phrasePopupToken) return;
            image.onload = null;
            image.onerror = null;
            image.alt = safeText ? `Image for ${safeText}` : 'Selected phrase image';
            imageShell.hidden = false;
        };
        image.onerror = tryNextImage;
        image.src = candidate;
    };

    tryNextImage();
}

function getPreferredSpeechVoice() {
  const synth = window.speechSynthesis;
  if (!synth || typeof synth.getVoices !== 'function') return null;
  const voices = synth.getVoices() || [];
  if (!voices.length) return null;

  const preferredLanguagePrefixes = ['en-NZ', 'en-AU', 'en-GB', 'en-US', 'en'];
  for (const prefix of preferredLanguagePrefixes) {
    const match = voices.find(voice => String(voice.lang || '').toLowerCase().startsWith(prefix.toLowerCase()));
    if (match) return match;
  }
  return voices[0] || null;
}

function warmSpeechVoices() {
  const synth = window.speechSynthesis;
  if (!synth || typeof synth.getVoices !== 'function') return Promise.resolve([]);

  const existing = synth.getVoices();
  if (existing && existing.length) return Promise.resolve(existing);
  if (speechVoicesReadyPromise) return speechVoicesReadyPromise;

  speechVoicesReadyPromise = new Promise(resolve => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve(synth.getVoices ? synth.getVoices() : []);
    };

    if ('onvoiceschanged' in synth) {
      const previousHandler = synth.onvoiceschanged;
      synth.onvoiceschanged = function(event) {
        if (typeof previousHandler === 'function') previousHandler.call(synth, event);
        finish();
      };
    }
    setTimeout(finish, 700);
  });

  return speechVoicesReadyPromise;
}

function primeSpeechSynthesis() {
  const synth = window.speechSynthesis;
  if (!synth || speechSynthesisPrimed || typeof SpeechSynthesisUtterance === 'undefined') return;
  speechSynthesisPrimed = true;
  warmSpeechVoices().catch(() => {});

  // Some desktop/mobile browsers only initialise voices after a user gesture.
  // A silent priming utterance helps later phrase fallback speech work reliably.
  try {
    const primer = new SpeechSynthesisUtterance(' ');
    primer.volume = 0;
    primer.rate = 1;
    synth.speak(primer);
    setTimeout(() => {
      try { synth.cancel(); } catch (_) {}
    }, 50);
  } catch (_) {}
}

document.addEventListener('pointerdown', primeSpeechSynthesis, { once: true, passive: true });
document.addEventListener('touchstart', primeSpeechSynthesis, { once: true, passive: true });
document.addEventListener('click', primeSpeechSynthesis, { once: true, passive: true });

function speakText(text, buttonElement, options = {}) {
  const spokenText = String(text || '').trim();
  const synth = window.speechSynthesis;
  if (synth) {
    try { synth.cancel(); } catch (_) {}
  }

  const popupToken = options.popupToken || (options.showPopup === false ? null : showPhrasePopup(spokenText));

  // --- Click sound ---
  if (typeof CLICK_SOUND !== 'undefined' && CLICK_SOUND) {
    CLICK_SOUND.currentTime = 0;
    CLICK_SOUND.play().catch(() => {});
  }

  // --- Button highlight ---
  if (buttonElement) {
    buttonElement.classList.add('speaking');
  }

  let finished = false;
  let watchdog = null;
  let retriedAfterVoicesLoaded = false;

  const finishSpeech = () => {
    if (finished) return;
    finished = true;
    if (watchdog) clearTimeout(watchdog);
    activeSpeechUtterance = null;
    if (buttonElement) buttonElement.classList.remove('speaking');
    if (popupToken) closePhrasePopupAfterMinimum(popupToken);
  };

  if (!spokenText || !synth || typeof SpeechSynthesisUtterance === 'undefined') {
    finishSpeech();
    return;
  }

  const speakNow = () => {
    if (finished) return;

    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.rate = spokenText.length > 100 ? 0.85 : 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const preferredVoice = getPreferredSpeechVoice();
    if (preferredVoice) {
      utterance.voice = preferredVoice;
      utterance.lang = preferredVoice.lang || 'en-NZ';
    } else {
      utterance.lang = 'en-NZ';
    }

    utterance.onstart = () => {
      if (watchdog) clearTimeout(watchdog);
      watchdog = setTimeout(finishSpeech, Math.max(6000, spokenText.length * 90));
    };
    utterance.onend = finishSpeech;
    utterance.onerror = () => {
      // Desktop Chrome/Edge can error if voices were still initialising. Retry once.
      if (!retriedAfterVoicesLoaded) {
        retriedAfterVoicesLoaded = true;
        warmSpeechVoices().then(() => {
          if (!finished) speakNow();
        }).catch(finishSpeech);
        return;
      }
      finishSpeech();
    };

    activeSpeechUtterance = utterance; // keep a reference so some browsers do not garbage collect it mid-speech
    try {
      synth.speak(utterance);
      watchdog = setTimeout(() => {
        // If speech never starts, retry once after voices have loaded.
        if (!finished && !retriedAfterVoicesLoaded && synth.speaking === false && synth.pending === false) {
          retriedAfterVoicesLoaded = true;
          warmSpeechVoices().then(() => {
            if (!finished) speakNow();
          }).catch(finishSpeech);
        }
      }, 900);
    } catch (error) {
      console.warn('Text-to-speech failed:', error);
      finishSpeech();
    }
  };

  // First attempt stays synchronous for iPhone/iPad user-gesture requirements.
  speakNow();
  warmSpeechVoices().catch(() => {});
}

// ============================================================================
// BIRTHDAY COUNTDOWN FUNCTIONS
// ============================================================================

function getBirthdayCountdown(birthday) {
    if (!birthday) return "";
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentYear = today.getFullYear();
    
    const birthDate = new Date(birthday);
    const nextBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());
    
    if (nextBirthday < today) {
        nextBirthday.setFullYear(currentYear + 1);
    }
    
    const diffTime = nextBirthday - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today! 🎉";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays === 2) return "2 days";
    
    const months = Math.floor(diffDays / 30);
    const remainingDaysAfterMonths = diffDays % 30;
    const weeks = Math.floor(remainingDaysAfterMonths / 7);
    const days = remainingDaysAfterMonths % 7;
    
    if (diffDays <= 7) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
    } else if (diffDays <= 14) {
        return `1 week${weeks > 1 ? 's' : ''}`;
    } else if (diffDays <= 30) {
        return `${weeks} week${weeks > 1 ? 's' : ''}`;
    } else {
        if (months > 0 && weeks > 0) {
            return `${months} month${months > 1 ? 's' : ''} and ${weeks} week${weeks > 1 ? 's' : ''}`;
        } else {
            return `${months} month${months > 1 ? 's' : ''}`;
        }
    }
}

// ============================================================================
// PERSON PROFILE FUNCTIONS
// ============================================================================

function speakPersonIntroduction(personName) {
    const person = buttonData.MyPeople.find(p => p.text === personName);
    if (!person) return;

    let introduction = "";
    
    if (person.detailedIntro) {
        introduction = person.detailedIntro;
    } else {
        introduction = `This is ${person.text}`;
        
        if (person.relationship) {
            introduction += `, ${person.relationship}`;
        }
        
        if (person.occupation) {
            introduction += `. ${person.occupation}`;
        }
        
        if (person.location) {
            introduction += `. ${person.location}`;
        }
        
        if (person.family) {
            introduction += `. ${person.family}`;
        }
        
        if (person.additionalInfo) {
            introduction += `. ${person.additionalInfo}`;
        }
    }

    if (person.birthday) {
        const birthDate = new Date(person.birthday);
        const options = { month: 'long', day: 'numeric' };
        const formattedDate = birthDate.toLocaleDateString('en-US', options);
        
        const day = birthDate.getDate();
        let suffix = 'th';
        if (day === 1 || day === 21 || day === 31) suffix = 'st';
        else if (day === 2 || day === 22) suffix = 'nd';
        else if (day === 3 || day === 23) suffix = 'rd';
        
        const dateWithSuffix = formattedDate.replace(day.toString(), day + suffix);
        const countdownPhrase = getBirthdayCountdown(person.birthday);
        
        introduction += `. ${person.text}'s birthday is on ${dateWithSuffix}, ${countdownPhrase}`;
    }

    speakText(introduction);
}

function formatBirthday(birthday) {
    if (!birthday) return "";
    const date = new Date(birthday);
    return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function createPersonProfile(person) {
    const modal = document.createElement('div');
    const safeName = escapeHtml(person.text || 'Person');
    const safeRelationship = escapeHtml(person.relationship || '');
    const safeOccupation = escapeHtml(person.occupation || '');
    const profileImagePath = getImagePath('MyPeople', person.image);
    const profileIcon = getFallbackIcon('MyPeople', person.text);
    const profileImage = `
        <div class="profile-image-shell">
            <img ${profileImagePath ? `src="${escapeHtml(profileImagePath)}"` : ''} alt="${safeName}" class="profile-image" data-private-media-key="${escapeHtml(getPrivateMediaKey('phrase', person))}" onload="this.classList.add('loaded'); this.nextElementSibling.style.display='none';" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <span class="profile-fallback-icon" aria-hidden="true">${profileIcon}</span>
        </div>
    `;

    modal.className = 'person-modal';
    modal.innerHTML = `
        <div class="person-profile">
            <button class="close-profile">&times;</button>
            <div class="profile-header">
                ${profileImage}
                <div class="profile-info">
                    <h2>${safeName}</h2>
                    <p class="relationship">${safeRelationship}</p>
                    ${person.occupation ? `<p class="occupation">${safeOccupation}</p>` : ''}
                </div>
            </div>
            
            <div class="profile-details">
                ${person.location ? `
                    <div class="detail-item">
                        <span class="detail-label">📍 Location:</span>
                        <span class="detail-value">${escapeHtml(person.location)}</span>
                    </div>
                ` : ''}
                
                ${person.birthday ? `
                    <div class="detail-item">
                        <span class="detail-label">🎂 Birthday:</span>
                        <span class="detail-value">${escapeHtml(formatBirthday(person.birthday))}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">⏰ Countdown:</span>
                        <span class="detail-value countdown-badge">${escapeHtml(getBirthdayCountdown(person.birthday))}</span>
                    </div>
                ` : ''}
                
                ${person.phone ? `
                    <div class="detail-item">
                        <span class="detail-label">📞 Phone:</span>
                        <span class="detail-value">${escapeHtml(person.phone)}</span>
                    </div>
                ` : ''}
                
                ${person.family ? `
                    <div class="detail-item">
                        <span class="detail-label">👨‍👩‍👧‍👦 Family:</span>
                        <span class="detail-value">${escapeHtml(person.family)}</span>
                    </div>
                ` : ''}
                
                ${person.hobbies ? `
                    <div class="detail-item">
                        <span class="detail-label">🎯 Hobbies:</span>
                        <span class="detail-value">${escapeHtml(person.hobbies)}</span>
                    </div>
                ` : ''}
                
                ${person.additionalInfo ? `
                    <div class="detail-item">
                        <span class="detail-label">💫 More Info:</span>
                        <span class="detail-value">${escapeHtml(person.additionalInfo)}</span>
                    </div>
                ` : ''}
            </div>
            
            <div class="profile-actions">
                <button class="action-btn speak-btn" onclick="speakPersonIntroduction('${escapeHtml(person.text)}')">
                    🔊 Introduce
                </button>
                <button class="action-btn call-btn" onclick="speakText('I would like to call ${escapeHtml(person.text)}', this)">
                    📞 Call
                </button>
                <button class="action-btn message-btn" onclick="speakText('I want to send a message to ${escapeHtml(person.text)}', this)">
                    💬 Message
                </button>
            </div>
        </div>
    `;
    
    modal.querySelector('.close-profile').addEventListener('click', function() {
        document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
    
    document.addEventListener('keydown', function closeOnEscape(e) {
        if (e.key === 'Escape') {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
            document.removeEventListener('keydown', closeOnEscape);
        }
    });
    
    document.body.appendChild(modal);
    applyPrivateImagesIn(modal);
    return modal;
}

// ============================================================================
// CONTENT MANAGEMENT FUNCTIONS
// ============================================================================

function populateRemovePhraseOptions() {
    const categorySelect = document.getElementById('removeCategorySelect');
    const phraseSelect = document.getElementById('removePhraseSelect');
    const category = categorySelect.value;
    
    phraseSelect.innerHTML = '';
    
    if (buttonData[category]) {
        buttonData[category].forEach(phrase => {
            const option = document.createElement('option');
            option.value = phrase.text;
            option.textContent = phrase.text;
            phraseSelect.appendChild(option);
        });
    }
}

function populateEditPhraseOptions() {
    const categorySelect = document.getElementById('editCategorySelect');
    const phraseSelect = document.getElementById('editPhraseSelect');
    const category = categorySelect.value;
    
    phraseSelect.innerHTML = '';
    
    if (buttonData[category]) {
        buttonData[category].forEach(phrase => {
            const option = document.createElement('option');
            option.value = phrase.text;
            option.textContent = phrase.text;
            phraseSelect.appendChild(option);
        });
        
        if (buttonData[category].length > 0) {
            const firstPhrase = buttonData[category][0];
            document.getElementById('editPhraseText').value = firstPhrase.text;
            document.getElementById('editPhraseImage').value = firstPhrase.image;
        }
    }
}

function updateEditFields() {
    const category = document.getElementById('editCategorySelect').value;
    const phraseSelect = document.getElementById('editPhraseSelect');
    const selectedText = phraseSelect.value;
    
    if (selectedText && buttonData[category]) {
        const phrase = buttonData[category].find(p => p.text === selectedText);
        if (phrase) {
            document.getElementById('editPhraseText').value = phrase.text;
            document.getElementById('editPhraseImage').value = phrase.image;
        }
    }
}

function populateReorderList() {
    const category = document.getElementById('reorderCategorySelect').value;
    const phraseList = document.getElementById('phraseList');
    
    phraseList.innerHTML = '';
    
    if (!buttonData[category] || buttonData[category].length === 0) {
        phraseList.innerHTML = `
            <div class="reorder-instructions">
                No phrases in this category to reorder
            </div>
        `;
        return;
    }
    
    buttonData[category].forEach((phrase, index) => {
        const li = document.createElement('li');
        li.className = 'phrase-item';
        li.draggable = true;
        li.dataset.index = index;
        
        li.innerHTML = `
            <span class="phrase-handle">☰</span>
            <span class="phrase-text">${phrase.text}</span>
            <span class="phrase-image">${phrase.image}</span>
        `;
        
        li.addEventListener('dragstart', handleDragStart);
        li.addEventListener('dragover', handleDragOver);
        li.addEventListener('drop', handleDrop);
        li.addEventListener('dragend', handleDragEnd);
        
        phraseList.appendChild(li);
    });
}

// Drag and drop functions
let draggedItem = null;

function handleDragStart(e) {
    draggedItem = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    this.classList.add('drop-zone');
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    document.querySelectorAll('.phrase-item').forEach(item => {
        item.classList.remove('drop-zone');
    });
}

function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('drop-zone');
    
    if (draggedItem !== this) {
        const phraseList = document.getElementById('phraseList');
        const items = Array.from(phraseList.querySelectorAll('.phrase-item'));
        const fromIndex = items.indexOf(draggedItem);
        const toIndex = items.indexOf(this);
        
        if (fromIndex !== -1 && toIndex !== -1) {
            const category = document.getElementById('reorderCategorySelect').value;
            const [movedItem] = buttonData[category].splice(fromIndex, 1);
            buttonData[category].splice(toIndex, 0, movedItem);
            
            if (fromIndex < toIndex) {
                phraseList.insertBefore(draggedItem, this.nextSibling);
            } else {
                phraseList.insertBefore(draggedItem, this);
            }
            
            items.forEach((item, index) => {
                item.dataset.index = index;
            });
        }
    }
}

function addNewPhrase() {
    const category = document.getElementById('addCategorySelect').value;
    const text = document.getElementById('newPhraseText').value.trim();
    const image = document.getElementById('newPhraseImage').value.trim();
    
    if (!text) {
        alert('Please enter phrase text');
        return;
    }
    
    if (!buttonData[category]) {
        buttonData[category] = [];
    }
    
    if (buttonData[category].some(p => p.text === text)) {
        alert('This phrase already exists in the selected category');
        return;
    }
    
    const meta = getCategoryMeta(category);
    const nextNumber = buttonData[category].length + 1;
    const id = `${meta.prefix}${String(nextNumber).padStart(2, '0')}`;

    buttonData[category].push({
        id: id,
        text: text,
        image: image || `${id}.jpg`
    });
    
    saveDataToStorage();
    
    document.getElementById('newPhraseText').value = '';
    document.getElementById('newPhraseImage').value = '';
    
    populateRemovePhraseOptions();
    populateEditPhraseOptions();
    populateReorderList();
    
    const activeCategory = getCurrentCategory();
    if (activeCategory === category) {
        populateGrid(category);
    }
    
    alert(`Added "${text}" to ${category}`);
    showToast('💾 Remember to export a backup after changes', 'warning');

}

function removeSelectedPhrase() {
    const category = document.getElementById('removeCategorySelect').value;
    const phraseSelect = document.getElementById('removePhraseSelect');
    const text = phraseSelect.value;
    
    if (!text) {
        alert('Please select a phrase to remove');
        return;
    }
    
    if (confirm(`Are you sure you want to remove "${text}" from ${category}?`)) {
        buttonData[category] = buttonData[category].filter(item => item.text !== text);
        
        saveDataToStorage();
        
        populateRemovePhraseOptions();
        populateEditPhraseOptions();
        populateReorderList();
        
        const activeCategory = getCurrentCategory();
        if (activeCategory === category) {
            populateGrid(category);
        }
        
        alert(`Removed "${text}" from ${category}`);
    }
}

function updateSelectedPhrase() {
    const category = document.getElementById('editCategorySelect').value;
    const oldText = document.getElementById('editPhraseSelect').value;
    const newText = document.getElementById('editPhraseText').value.trim();
    const newImage = document.getElementById('editPhraseImage').value.trim();
    
    if (!newText) {
        alert('Please enter phrase text');
        return;
    }
    
    if (!oldText) {
        alert('Please select a phrase to edit');
        return;
    }
    
    const phraseIndex = buttonData[category].findIndex(p => p.text === oldText);
    if (phraseIndex === -1) {
        alert('Phrase not found');
        return;
    }
    
    const duplicate = buttonData[category].find((p, index) => 
        p.text === newText && index !== phraseIndex
    );
    
    if (duplicate) {
        alert('This phrase already exists in the selected category');
        return;
    }
    
    const existingId = buttonData[category][phraseIndex].id || `${getCategoryMeta(category).prefix}${String(phraseIndex + 1).padStart(2, '0')}`;
    buttonData[category][phraseIndex] = {
        ...buttonData[category][phraseIndex],
        id: existingId,
        text: newText,
        image: newImage || `${existingId}.jpg`
    };
    
    saveDataToStorage();
    
    populateRemovePhraseOptions();
    populateEditPhraseOptions();
    populateReorderList();
    
    const activeCategory = getCurrentCategory();
    if (activeCategory === category) {
        populateGrid(category);
    }
    
    alert(`Updated phrase to "${newText}"`);
}

function saveNewOrder() {
    const category = document.getElementById('reorderCategorySelect').value;
    
    saveDataToStorage();
    
    const activeCategory = getCurrentCategory();
    if (activeCategory === category) {
        populateGrid(category);
    }
    
    alert(`New order saved for ${category}`);
}

function showAllPhrases() {
    console.log('=== ALL PHRASES ===');
    Object.keys(buttonData).forEach(category => {
        if (category !== 'MyPeople') {
            console.log(`\n--- ${category.toUpperCase()} ---`);
            buttonData[category].forEach(phrase => {
                console.log(`• ${phrase.text}`);
            });
        }
    });
    alert('Check browser console (F12) to see all phrases');
}

function reloadApp() {
    const activeCategory = getCurrentCategory();
    populateGrid(activeCategory);
    hideManagementPanel();
    alert('App reloaded!');
}

function exportButtonData() {
  try {
    const payload = {
      buttonData,
      categoryConfig: normaliseCategoryConfig(categoryConfig),
      appSettings: normaliseAppSettings(appSettings),
      lastModified: new Date().toISOString()
    };

    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `mynewvoice_content_backup_${new Date()
      .toISOString()
      .split('T')[0]}.json`;
    link.click();

    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    showToast('📤 Content backup exported successfully', 'success');
  } catch (err) {
    console.error('Export failed:', err);
    showToast('❌ Export failed', 'error');
  }
}




// === SERVICE WORKER REGISTRATION WITH UPDATE PROMPT ===
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then(reg => {
    reg.onupdatefound = () => {
      const newWorker = reg.installing;
      newWorker.onstatechange = () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // A new version is ready
          if (confirm('🔄 Update available. Reload now?')) {
            newWorker.postMessage('skipWaiting');
            window.location.reload();
          }
        }
      };
    };
  }).catch(err => console.error('SW registration failed:', err));
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('MyNewVoice app initializing...');
    installTouchInteractionLock();
    
    // Load saved data first
    loadAppSettings();
    loadCategoryConfig();
    loadDataFromStorage();
    refreshPrivateVoiceKeyIndex().catch(error => console.warn('Could not build private voice index:', error));
    
    // === OFFLINE STARTUP FALLBACK ===
    if (!buttonData || Object.keys(buttonData).length === 0) {
        console.warn('⚠️ No local data found — using minimal offline fallback.');
        buttonData = {
            food: [
                { text: "I'm hungry", image: "default.jpg" },
                { text: "I'd like a drink", image: "default.jpg" }
            ]
        };
    }


    // Build the main menu as stacked image cards, then show the main menu first.
    renderCategoryMenuCards();
    showMainMenu();
    if (appSettings.autoUpdateCheck) {
        setTimeout(() => checkForAppUpdate({ manual: false }), 1500);
    }
    
    // Top menu card click handlers are attached when renderCategoryMenuCards() builds the cards.

    const backToMenu = document.getElementById('backToMenu');
    if (backToMenu) {
        backToMenu.addEventListener('click', showMainMenu);
    }
    
    // Set up settings gateway button
    const toggleBtn = document.getElementById('managementToggle');
    if (toggleBtn) {
        toggleBtn.title = 'Settings';
        toggleBtn.setAttribute('aria-label', 'Open settings');
        toggleBtn.addEventListener('click', function() {
            showPasswordModal('settings');
        });
    }
    

    // Set up About box. It is opened from Settings only.
    const aboutModal = document.getElementById('aboutModal');
    const aboutClose = document.getElementById('aboutClose');

    if (aboutClose && aboutModal) {
        aboutClose.addEventListener('click', () => {
            aboutModal.style.display = 'none';
        });
        aboutModal.addEventListener('click', (event) => {
            if (event.target === aboutModal) aboutModal.style.display = 'none';
        });
    }

    // Set up password modal buttons
    const passwordSubmit = document.getElementById('passwordSubmit');
    if (passwordSubmit) {
        passwordSubmit.addEventListener('click', checkPassword);
    }
    
    const passwordCancel = document.getElementById('passwordCancel');
    if (passwordCancel) {
        passwordCancel.addEventListener('click', hidePasswordModal);
    }
    const passwordInput = document.getElementById('passwordInput');
    if (passwordInput) {
        passwordInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                checkPassword();
            }
        });
    }
    
    // Set up management panel buttons
  
    
    const addPhrase = document.getElementById('addPhrase');
    if (addPhrase) {
        addPhrase.addEventListener('click', addNewPhrase);
    }
    
    const removePhrase = document.getElementById('removePhrase');
    if (removePhrase) {
        removePhrase.addEventListener('click', removeSelectedPhrase);
    }
    const exportData = document.getElementById('exportData');
    if (exportData) {
        exportData.addEventListener('click', exportButtonData);
    }
    
// v15: day/night theme toggle removed. App remains in the standard light appearance for consistency.
document.body.dataset.theme = 'light';

    // === IMPORT DATA FEATURE ===
    const importDataBtn = document.getElementById('importData');
    const importFileInput = document.getElementById('importFile');

    if (importDataBtn && importFileInput) {
        // Clicking "Import Data" opens file chooser
        importDataBtn.addEventListener('click', () => importFileInput.click());

        // When user selects a JSON file
      importFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const imported = JSON.parse(event.target.result);
      const storedRaw = localStorage.getItem(STORAGE_KEY);
      let localData = {};
      if (storedRaw) {
        if (storedRaw.startsWith('{')) {
          localData = JSON.parse(storedRaw);
        } else {
          localData = JSON.parse(LZString.decompressFromUTF16(storedRaw) || '{}');
        }
      }

      const localTime = new Date(localData.lastModified || 0);
      const importTime = new Date(imported.lastModified || 0);

      if (importTime > localTime) {
        if (confirm(`Import file is newer (last updated ${importTime.toLocaleString()}). Replace current data?`)) {
          buttonData = imported.buttonData || imported; // support old format
          if (imported.categoryConfig) {
            categoryConfig = normaliseCategoryConfig(imported.categoryConfig);
            saveCategoryConfig();
          }
          if (imported.appSettings) {
            appSettings = normaliseAppSettings(imported.appSettings);
            saveAppSettings({ render: false });
          }
          saveDataToStorage();
          renderCategoryMenuCards();
          showMainMenu();
          showToast('✅ Newer data imported successfully!', 'success');
        } else {
          showToast('Import cancelled.', 'warning');
        }
      } else {
        showToast('⚠️ Import file is older or missing timestamp — skipped.', 'warning');
      }
    } catch (err) {
      alert('❌ Import failed: invalid file.');
      console.error(err);
    }
  };
  reader.readAsText(file);
});

    }

    const showAllPhrasesBtn = document.getElementById('showAllPhrases');
    if (showAllPhrasesBtn) {
        showAllPhrasesBtn.addEventListener('click', showAllPhrases);
    }
    
    const reloadAppBtn = document.getElementById('reloadApp');
    if (reloadAppBtn) {
        reloadAppBtn.addEventListener('click', reloadApp);
    }
    
    const resetData = document.getElementById('resetData');
    if (resetData) {
        resetData.addEventListener('click', resetToDefaultData);
    }
    
    // Edit and reorder event listeners
    const editCategorySelect = document.getElementById('editCategorySelect');
    if (editCategorySelect) {
        editCategorySelect.addEventListener('change', function() {
            populateEditPhraseOptions();
        });
    }

    const editPhraseSelect = document.getElementById('editPhraseSelect');
    if (editPhraseSelect) {
        editPhraseSelect.addEventListener('change', updateEditFields);
    }

    const updatePhrase = document.getElementById('updatePhrase');
    if (updatePhrase) {
        updatePhrase.addEventListener('click', updateSelectedPhrase);
    }

    const reorderCategorySelect = document.getElementById('reorderCategorySelect');
    if (reorderCategorySelect) {
        reorderCategorySelect.addEventListener('change', populateReorderList);
    }

    const saveOrder = document.getElementById('saveOrder');
    if (saveOrder) {
        saveOrder.addEventListener('click', saveNewOrder);
    }

    // Update remove phrase options when category changes
    const removeCategorySelect = document.getElementById('removeCategorySelect');
    if (removeCategorySelect) {
        removeCategorySelect.addEventListener('change', populateRemovePhraseOptions);
    }
    
    // Update all dropdowns when any category changes
    [removeCategorySelect, editCategorySelect, reorderCategorySelect].forEach(select => {
        if (select) {
            select.addEventListener('change', function() {
                populateRemovePhraseOptions();
                populateEditPhraseOptions();
                populateReorderList();
            });
        }
    });

    // Initial population of all dropdowns
    setTimeout(() => {
        populateRemovePhraseOptions();
        populateEditPhraseOptions();
        populateReorderList();
    }, 500);

// === MANAGEMENT OVERLAY CLICK BEHAVIOUR ===
const managementOverlay = document.getElementById('managementOverlay');
const managementPanel = document.getElementById('managementPanel');
const closeManagementBtn = document.getElementById('closeManagement');

if (managementOverlay && managementPanel) {
  // Close when clicking ❌
  if (closeManagementBtn) {
    closeManagementBtn.addEventListener('click', hideManagementPanel);
  }

  // Do not close when clicking outside the panel; this prevents accidental shutdown while editing or using file/photo pickers.

  // Optional: close with Escape only when the management editor is visibly open.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && managementOverlay.classList.contains('show')) hideManagementPanel();
  });
}
    

    console.log('App initialization complete!');
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('./sw.js')
            .then(function(registration) {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch(function(error) {
                console.log('ServiceWorker registration failed: ', error);
            });
    });
}