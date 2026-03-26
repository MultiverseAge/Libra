/* =============================================
   LIBRA — script.js
   Handles: modals, filtering, comments, nav
   ============================================= */

// ── DOM references ──────────────────────────────
const bookCards       = document.querySelectorAll('.book-card');
const filterBtns      = document.querySelectorAll('.filter-btn');
const bookModal       = document.getElementById('bookModal');
const closeModal      = document.getElementById('closeModal');
const suggestModal    = document.getElementById('suggestModal');
const openSuggest     = document.getElementById('openSuggest');
const openSuggestMob  = document.getElementById('openSuggestMobile');
const closeSuggest    = document.getElementById('closeSuggest');
const hamburger       = document.getElementById('hamburger');
const mobileMenu      = document.getElementById('mobileMenu');
const submitComment   = document.getElementById('submitComment');
const commentsList    = document.getElementById('commentsList');
const stars           = document.querySelectorAll('.star');
const mobileLinks     = document.querySelectorAll('.mobile-link');

let selectedRating = 0;

// ── Utility: encode book title for search URLs ───
function encodeSearch(title) {
  return encodeURIComponent(title);
}

function buildPdfDriveUrl(title) {
  return `https://www.pdfdrive.com.co/?s=${encodeSearch(title)}`;
}

function buildOceanPdfUrl(title) {
  return `https://oceanofpdf.com/?s=${encodeSearch(title)}`;
}

// ── Book Modal ────────────────────────────────────
bookCards.forEach(card => {
  card.addEventListener('click', () => openBookModal(card));
});

function openBookModal(card) {
  const title  = card.dataset.title;
  const author = card.dataset.author;
  const genre  = card.dataset.genre;

  // Clone the cover into the modal mini-cover
  const coverEl   = card.querySelector('.book-cover');
  const modalCover = document.getElementById('modalCover');
  modalCover.style.background = coverEl.style.background;
  modalCover.className = 'modal-cover';

  // Set text fields
  document.getElementById('modalTitle').textContent  = title;
  document.getElementById('modalAuthor').textContent = `by ${author}`;
  document.getElementById('modalGenre').textContent  = capitalize(genre);

  // Build source links
  document.getElementById('pdfDriveLink').href  = buildPdfDriveUrl(title);
  document.getElementById('oceanPdfLink').href  = buildOceanPdfUrl(title);

  openModal(bookModal);
}

closeModal.addEventListener('click', () => closeModalFn(bookModal));

// ── Suggest Modal ─────────────────────────────────
[openSuggest, openSuggestMob].forEach(btn => {
  btn?.addEventListener('click', () => {
    closeMobileMenu();
    openModal(suggestModal);
  });
});

closeSuggest.addEventListener('click', () => closeModalFn(suggestModal));

// Close modals on overlay click
[bookModal, suggestModal].forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModalFn(overlay);
  });
});

// Close modals on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModalFn(bookModal);
    closeModalFn(suggestModal);
  }
});

function openModal(overlay) {
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModalFn(overlay) {
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

// ── Genre Filter ──────────────────────────────────
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const genre = btn.dataset.genre;

    bookCards.forEach(card => {
      if (genre === 'all' || card.dataset.genre === genre) {
        card.classList.remove('hidden');
        card.style.animation = 'fadeUp 0.4s ease both';
      } else {
        card.classList.add('hidden');
      }
    });
  });
});

// ── Star Rating ───────────────────────────────────
stars.forEach(star => {
  star.addEventListener('click', () => {
    selectedRating = parseInt(star.dataset.val);
    highlightStars(selectedRating);
  });

  star.addEventListener('mouseenter', () => {
    highlightStars(parseInt(star.dataset.val));
  });
});

document.getElementById('starRating').addEventListener('mouseleave', () => {
  highlightStars(selectedRating);
});

function highlightStars(count) {
  stars.forEach(s => {
    s.classList.toggle('active', parseInt(s.dataset.val) <= count);
  });
}

// ── Comment Submission ────────────────────────────
submitComment.addEventListener('click', () => {
  const name  = document.getElementById('commentName').value.trim();
  const book  = document.getElementById('commentBook').value.trim();
  const text  = document.getElementById('commentText').value.trim();

  if (!name || !text) {
    shakeElement(submitComment);
    showToast('Please enter your name and review.');
    return;
  }

  // Build star string
  const filled = '★'.repeat(selectedRating || 0);
  const empty  = '☆'.repeat(5 - (selectedRating || 0));
  const starStr = filled + empty;

  // Create comment card
  const card = document.createElement('div');
  card.className = 'comment-card';
  card.style.animation = 'fadeUp 0.4s ease both';
  card.innerHTML = `
    <div class="comment-header">
      <div class="comment-avatar">${name.charAt(0).toUpperCase()}</div>
      <div>
        <strong>${escapeHtml(name)}</strong>
        ${book ? `<span class="comment-book">${escapeHtml(book)}</span>` : ''}
      </div>
      <div class="comment-stars">${starStr || '—'}</div>
    </div>
    <p>${escapeHtml(text)}</p>
  `;

  // Prepend to list
  commentsList.insertBefore(card, commentsList.firstChild);

  // Reset form
  document.getElementById('commentName').value  = '';
  document.getElementById('commentBook').value  = '';
  document.getElementById('commentText').value  = '';
  selectedRating = 0;
  highlightStars(0);

  showToast('Review posted! ✓');
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

// ── Hamburger / Mobile Menu ───────────────────────
hamburger.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
});

mobileLinks.forEach(link => {
  link.addEventListener('click', closeMobileMenu);
});

function closeMobileMenu() {
  mobileMenu.classList.remove('open');
}

// Close mobile menu on outside click
document.addEventListener('click', e => {
  if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
    closeMobileMenu();
  }
});

// ── Navbar scroll state ───────────────────────────
const nav = document.querySelector('.nav');
window.addEventListener('scroll', () => {
  if (window.scrollY > 40) {
    nav.style.borderBottomColor = 'rgba(200,169,110,0.15)';
  } else {
    nav.style.borderBottomColor = '#2a2a2a';
  }
});

// ── Toast notification ────────────────────────────
function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%);
    background: #1f1f1f; border: 1px solid #c8a96e; color: #e8e4dc;
    padding: 12px 28px; border-radius: 100px; font-size: 0.875rem;
    font-family: 'DM Sans', sans-serif; z-index: 999;
    animation: fadeUp 0.3s ease;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ── Shake animation on error ──────────────────────
function shakeElement(el) {
  el.style.animation = 'none';
  el.offsetHeight; // reflow
  el.style.animation = 'shake 0.35s ease';
  el.addEventListener('animationend', () => el.style.animation = '', { once: true });
}

// Add shake keyframes dynamically
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
  @keyframes shake {
    0%,100% { transform: translateX(0); }
    20% { transform: translateX(-6px); }
    40% { transform: translateX(6px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
  }
`;
document.head.appendChild(shakeStyle);

// ── HTML Escape (XSS prevention) ─────────────────
function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// ── Capitalize first letter ───────────────────────
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ── Intersection Observer for book cards ─────────
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      entry.target.style.animationDelay = `${i * 0.05}s`;
      entry.target.style.animation = 'fadeUp 0.5s ease both';
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

bookCards.forEach(card => observer.observe(card));