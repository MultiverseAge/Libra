/* =============================================
   LIBRA v2 — script.js
   Features:
   - Seed library with Open Library real covers
   - AI-powered book metadata fetch (Anthropic API)
   - Open Library cover image fetch
   - Genre filter + search
   - Book detail modal (PDFDrive + OceanPDF links)
   - Admin add book flow
   - Visitor suggestion form (FormSubmit)
   - Comments / reviews
   ============================================= */

// ─── SEED DATA ────────────────────────────────
const SEED_BOOKS = [
  { title: "1984",                       author: "George Orwell",         genre: "fiction",    year: "1949", desc: "A chilling vision of a totalitarian future where Big Brother watches your every move." },
  { title: "To Kill a Mockingbird",      author: "Harper Lee",            genre: "classic",    year: "1960", desc: "A profound tale of racial injustice and moral growth in the American South." },
  { title: "The Great Gatsby",           author: "F. Scott Fitzgerald",   genre: "classic",    year: "1925", desc: "A glittering portrait of the Jazz Age and the hollow pursuit of the American Dream." },
  { title: "Meditations",                author: "Marcus Aurelius",       genre: "philosophy", year: "180",  desc: "Personal writings of the Roman Emperor — a timeless guide to Stoic living." },
  { title: "A Brief History of Time",    author: "Stephen Hawking",       genre: "science",    year: "1988", desc: "Hawking's landmark exploration of the cosmos, black holes, and the nature of time." },
  { title: "Atomic Habits",              author: "James Clear",           genre: "self-help",  year: "2018", desc: "A proven framework for building good habits and breaking bad ones, one percent at a time." },
  { title: "The Alchemist",              author: "Paulo Coelho",          genre: "fiction",    year: "1988", desc: "A shepherd boy's journey across the desert in pursuit of his Personal Legend." },
  { title: "Sapiens",                    author: "Yuval Noah Harari",     genre: "science",    year: "2011", desc: "A sweeping history of humankind from the Stone Age to the twenty-first century." },
  { title: "Crime and Punishment",       author: "Fyodor Dostoevsky",     genre: "classic",    year: "1866", desc: "A psychological portrait of guilt, punishment, and redemption in Tsarist Russia." },
  { title: "The Power of Now",           author: "Eckhart Tolle",         genre: "self-help",  year: "1997", desc: "A spiritual guide to living fully in the present moment and escaping the thinking mind." },
  { title: "Thus Spoke Zarathustra",     author: "Friedrich Nietzsche",   genre: "philosophy", year: "1883", desc: "Nietzsche's philosophical novel exploring the Übermensch, the will to power, and eternal return." },
  { title: "Pride and Prejudice",        author: "Jane Austen",           genre: "classic",    year: "1813", desc: "The witty story of Elizabeth Bennet and Mr. Darcy — a masterpiece of English literature." },
];

// ─── STATE ────────────────────────────────────
let library    = [];   // array of book objects
let activeGenre = 'all';
let searchQuery = '';
let selectedStars = 0;

// ─── OPEN LIBRARY COVER FETCH ─────────────────
// Returns best available cover URL or null
async function fetchOpenLibraryCover(title, author) {
  try {
    const q = encodeURIComponent(`title:${title} author:${author}`);
    const res = await fetch(`https://openlibrary.org/search.json?q=${q}&limit=5&fields=key,cover_i,isbn`);
    if (!res.ok) return null;
    const data = await res.json();
    const docs = data.docs || [];

    for (const doc of docs) {
      if (doc.cover_i) {
        return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
      }
      if (doc.isbn && doc.isbn.length) {
        return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-L.jpg`;
      }
    }
  } catch (_) {}
  return null;
}

// Also try a simpler title-only search as fallback
async function fetchCoverFallback(title) {
  try {
    const q = encodeURIComponent(title);
    const res = await fetch(`https://openlibrary.org/search.json?title=${q}&limit=3&fields=cover_i`);
    if (!res.ok) return null;
    const data = await res.json();
    const doc = (data.docs || []).find(d => d.cover_i);
    if (doc) return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
  } catch (_) {}
  return null;
}

async function getBookCover(title, author) {
  let url = await fetchOpenLibraryCover(title, author);
  if (!url) url = await fetchCoverFallback(title);
  return url;
}

// ─── ANTHROPIC API — AI BOOK METADATA ─────────
async function fetchBookMetadataFromAI(rawTitle) {
  const prompt = `You are a book database. Given a book title, return ONLY a valid JSON object with these exact keys:
{
  "title": "...",
  "author": "...",
  "genre": "fiction|classic|philosophy|science|self-help|biography|other",
  "year": "YYYY",
  "desc": "Two-sentence description of the book."
}
Book title: "${rawTitle}"
Return ONLY the JSON, no markdown, no extra text.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!response.ok) throw new Error("API error " + response.status);
  const data = await response.json();
  const text = data.content.map(b => b.text || "").join("").trim();
  // Strip any accidental markdown fences
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// ─── COLOUR GRADIENTS FOR FALLBACK COVERS ─────
const GRADIENTS = [
  "linear-gradient(135deg,#1a1a2e,#16213e)",
  "linear-gradient(135deg,#2d4a22,#4a7c59)",
  "linear-gradient(135deg,#1c1c3a,#2e2e5e)",
  "linear-gradient(135deg,#3d2b1f,#7a5c44)",
  "linear-gradient(135deg,#0a0a1a,#1a1a4e)",
  "linear-gradient(135deg,#1a3a1a,#2d6a2d)",
  "linear-gradient(135deg,#3a2000,#8b5e00)",
  "linear-gradient(135deg,#1a1008,#4a3010)",
  "linear-gradient(135deg,#0d0d1a,#1a1a3a)",
  "linear-gradient(135deg,#001a1a,#003a3a)",
  "linear-gradient(135deg,#2a0a0a,#5c1a1a)",
  "linear-gradient(135deg,#2a1a0a,#6b4226)",
];
let gradientIndex = 0;
function nextGradient() { return GRADIENTS[gradientIndex++ % GRADIENTS.length]; }

// ─── BUILD BOOK CARD ──────────────────────────
function buildCard(book) {
  const card = document.createElement('div');
  card.className = 'book-card';
  card.dataset.genre = book.genre;
  card.dataset.title = book.title.toLowerCase();
  card.dataset.author = (book.author || '').toLowerCase();

  const firstLetter = book.title.charAt(0).toUpperCase();
  const gradient = book._gradient || nextGradient();
  book._gradient = gradient;

  card.innerHTML = `
    <div class="cover-wrap" style="background:${gradient}">
      ${book.coverUrl
        ? `<img class="cover-img" src="${book.coverUrl}" alt="${escHtml(book.title)} cover" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>`
        : ''}
      <div class="cover-fallback" style="${book.coverUrl ? 'display:none' : ''}">
        <div class="fallback-letter">${firstLetter}</div>
        <div class="fallback-title">${escHtml(book.title)}</div>
      </div>
      <div class="cover-hover"><span>View Sources</span></div>
    </div>
    <div class="card-genre">${escHtml(book.genre)}</div>
    <div class="card-title">${escHtml(book.title)}</div>
    <div class="card-author">${escHtml(book.author || '')}</div>
    ${book.year ? `<div class="card-year">${escHtml(String(book.year))}</div>` : ''}
  `;

  card.addEventListener('click', () => openBookModal(book, card));
  return card;
}

// ─── RENDER GRID ──────────────────────────────
function renderGrid() {
  const grid = $('booksGrid');
  const empty = $('emptyState');
  grid.innerHTML = '';

  const filtered = library.filter(b => {
    const genreMatch = activeGenre === 'all' || b.genre === activeGenre;
    const q = searchQuery.toLowerCase();
    const searchMatch = !q || b.title.toLowerCase().includes(q) || (b.author || '').toLowerCase().includes(q);
    return genreMatch && searchMatch;
  });

  if (!filtered.length) {
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    filtered.forEach((b, i) => {
      const card = buildCard(b);
      card.style.animationDelay = `${i * 0.04}s`;
      grid.appendChild(card);
    });
  }
  $('statCount').textContent = library.length;
}

// ─── LOAD SEED BOOKS ──────────────────────────
async function loadSeedBooks() {
  for (const b of SEED_BOOKS) {
    library.push({ ...b, coverUrl: null });
  }
  renderGrid();

  // Fetch covers async and update cards live
  for (const b of library) {
    const url = await getBookCover(b.title, b.author);
    if (url) {
      b.coverUrl = url;
      // Update any rendered card for this book
      updateCardCover(b);
    }
  }
}

function updateCardCover(book) {
  const cards = document.querySelectorAll('.book-card');
  for (const card of cards) {
    if (card.dataset.title === book.title.toLowerCase()) {
      const wrap = card.querySelector('.cover-wrap');
      const existingImg = wrap.querySelector('.cover-img');
      const fb = wrap.querySelector('.cover-fallback');
      if (existingImg) {
        existingImg.src = book.coverUrl;
        existingImg.style.display = 'block';
        if (fb) fb.style.display = 'none';
      } else {
        const img = document.createElement('img');
        img.className = 'cover-img';
        img.src = book.coverUrl;
        img.alt = book.title + ' cover';
        img.loading = 'lazy';
        img.onerror = function() { this.style.display = 'none'; if (fb) fb.style.display = 'flex'; };
        if (fb) fb.style.display = 'none';
        wrap.insertBefore(img, wrap.querySelector('.cover-fallback'));
      }
    }
  }
}

// ─── BOOK DETAIL MODAL ────────────────────────
function openBookModal(book, _card) {
  const bmImg  = $('bmImg');
  const bmFb   = $('bmFb');

  if (book.coverUrl) {
    bmImg.src = book.coverUrl;
    bmImg.style.display = 'block';
    bmFb.style.display = 'none';
  } else {
    bmImg.style.display = 'none';
    bmFb.style.display = 'flex';
    bmFb.style.background = book._gradient || '#1a1a2e';
    bmFb.textContent = book.title.charAt(0).toUpperCase();
  }

  $('bmGenre').textContent = cap(book.genre);
  $('bmTitle').textContent = book.title;
  $('bmAuthor').textContent = 'by ' + (book.author || 'Unknown');
  $('bmDesc').textContent  = book.desc || 'A wonderful read available for free.';
  $('bmPdf').href   = `https://www.pdfdrive.com.co/?s=${enc(book.title)}`;
  $('bmOcean').href = `https://oceanofpdf.com/?s=${enc(book.title)}`;

  openOverlay('bookModal');
}

// ─── FILTER & SEARCH ──────────────────────────
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeGenre = btn.dataset.genre;
    renderGrid();
  });
});

$('searchInput').addEventListener('input', e => {
  searchQuery = e.target.value;
  renderGrid();
});

// ─── ADMIN MODAL — AI AUTO-FILL ───────────────
const aiFetchBtn = $('aiFetchBtn');
const aiInput    = $('aiInput');
let pendingCoverUrl = null;

aiFetchBtn.addEventListener('click', async () => {
  const title = aiInput.value.trim();
  if (!title) { shake(aiFetchBtn); toast('Enter a book title first.'); return; }

  // Show spinner
  $('fetchLabel').style.display = 'none';
  $('fetchSpinner').style.display = 'inline-block';
  aiFetchBtn.disabled = true;

  try {
    // 1. Fetch metadata from AI
    const meta = await fetchBookMetadataFromAI(title);

    // 2. Populate fields
    $('pfTitle').value  = meta.title  || title;
    $('pfAuthor').value = meta.author || '';
    $('pfYear').value   = meta.year   || '';
    $('pfDesc').value   = meta.desc   || '';
    const genreEl = $('pfGenre');
    if (meta.genre) {
      for (const opt of genreEl.options) {
        if (opt.value === meta.genre) { genreEl.value = meta.genre; break; }
      }
    }

    // 3. Show preview (cover loading state)
    $('aiPreview').style.display = 'block';
    $('confirmAdd').style.display = 'block';
    $('previewFb').textContent = (meta.title || title).charAt(0).toUpperCase();
    $('previewImg').style.display = 'none';
    $('coverLoading').style.display = 'flex';
    pendingCoverUrl = null;

    // 4. Fetch cover async
    const coverUrl = await getBookCover(meta.title || title, meta.author || '');
    $('coverLoading').style.display = 'none';
    if (coverUrl) {
      pendingCoverUrl = coverUrl;
      $('previewImg').src = coverUrl;
      $('previewImg').style.display = 'block';
      $('previewFb').style.display = 'none';
    } else {
      $('previewFb').style.display = 'flex';
    }

    toast('✦ Metadata filled! Review and confirm.');
  } catch (err) {
    console.error(err);
    toast('Could not fetch metadata. Fill in manually.');
    $('aiPreview').style.display = 'block';
    $('confirmAdd').style.display = 'block';
    $('pfTitle').value = title;
    $('coverLoading').style.display = 'none';
    $('previewFb').textContent = title.charAt(0).toUpperCase();
  } finally {
    $('fetchLabel').style.display = 'inline';
    $('fetchSpinner').style.display = 'none';
    aiFetchBtn.disabled = false;
  }
});

$('confirmAdd').addEventListener('click', () => {
  const title  = $('pfTitle').value.trim();
  const author = $('pfAuthor').value.trim();
  if (!title) { shake($('pfTitle')); toast('Title is required.'); return; }

  const book = {
    title,
    author,
    genre:    $('pfGenre').value,
    year:     $('pfYear').value.trim(),
    desc:     $('pfDesc').value.trim(),
    coverUrl: pendingCoverUrl || null,
  };

  library.unshift(book);
  renderGrid();
  closeOverlay('adminModal');
  toast(`"${title}" added to the library ✓`);

  // Reset admin form
  aiInput.value = '';
  $('aiPreview').style.display = 'none';
  $('confirmAdd').style.display = 'none';
  $('previewImg').style.display = 'none';
  $('previewFb').textContent = '';
  pendingCoverUrl = null;

  // If cover wasn't loaded yet, try again in background
  if (!book.coverUrl) {
    getBookCover(title, author).then(url => {
      if (url) { book.coverUrl = url; updateCardCover(book); }
    });
  }
});

// ─── STAR RATING ──────────────────────────────
document.querySelectorAll('.star').forEach(s => {
  s.addEventListener('click', () => {
    selectedStars = parseInt(s.dataset.val);
    highlightStars(selectedStars);
  });
  s.addEventListener('mouseenter', () => highlightStars(parseInt(s.dataset.val)));
});
$('starRating').addEventListener('mouseleave', () => highlightStars(selectedStars));

function highlightStars(n) {
  document.querySelectorAll('.star').forEach(s => {
    s.classList.toggle('active', parseInt(s.dataset.val) <= n);
  });
}

// ─── SUBMIT COMMENT ───────────────────────────
$('submitComment').addEventListener('click', () => {
  const name = $('cName').value.trim();
  const book = $('cBook').value.trim();
  const text = $('cText').value.trim();
  if (!name || !text) { shake($('submitComment')); toast('Name and review are required.'); return; }

  const filled = '★'.repeat(selectedStars);
  const empty  = '☆'.repeat(5 - selectedStars);

  const card = document.createElement('div');
  card.className = 'comment-card';
  card.innerHTML = `
    <div class="comment-header">
      <div class="avatar">${escHtml(name.charAt(0).toUpperCase())}</div>
      <div class="cmeta">
        <strong>${escHtml(name)}</strong>
        ${book ? `<span class="cbk">${escHtml(book)}</span>` : ''}
      </div>
      <div class="cstars">${filled + empty || '—'}</div>
    </div>
    <p>${escHtml(text)}</p>
  `;

  const list = $('commentsList');
  list.insertBefore(card, list.firstChild);
  $('cName').value = $('cBook').value = $('cText').value = '';
  selectedStars = 0;
  highlightStars(0);
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  toast('Review posted ✓');
});

// ─── MODALS ───────────────────────────────────
function openOverlay(id) {
  $(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeOverlay(id) {
  $(id).classList.remove('open');
  document.body.style.overflow = '';
}

// Open triggers
['openAdmin','openAdminMob','openAdminHero'].forEach(id => {
  const el = $(id);
  if (el) el.addEventListener('click', () => { closeMobMenu(); openOverlay('adminModal'); });
});
['openSuggest','openSuggestMob'].forEach(id => {
  const el = $(id);
  if (el) el.addEventListener('click', () => { closeMobMenu(); openOverlay('suggestModal'); });
});
$('addFirstBook') && $('addFirstBook').addEventListener('click', () => openOverlay('adminModal'));

// Close triggers
[['closeBookModal','bookModal'],['closeAdminModal','adminModal'],['closeSuggestModal','suggestModal']].forEach(([btn,modal]) => {
  const el = $(btn);
  if (el) el.addEventListener('click', () => closeOverlay(modal));
});

// Click outside
['bookModal','adminModal','suggestModal'].forEach(id => {
  $(id).addEventListener('click', e => { if (e.target === $(id)) closeOverlay(id); });
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') ['bookModal','adminModal','suggestModal'].forEach(closeOverlay);
});

// ─── HAMBURGER ────────────────────────────────
const hamburger  = $('hamburger');
const mobileMenu = $('mobileMenu');

hamburger.addEventListener('click', e => { e.stopPropagation(); mobileMenu.classList.toggle('open'); });
document.querySelectorAll('.mobile-link').forEach(l => l.addEventListener('click', closeMobMenu));
document.addEventListener('click', e => {
  if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) closeMobMenu();
});
function closeMobMenu() { mobileMenu.classList.remove('open'); }

// ─── NAV SCROLL ───────────────────────────────
const nav = $('mainNav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// ─── INTERSECTION OBSERVER ────────────────────
const io = new IntersectionObserver(entries => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) {
      e.target.style.animationDelay = `${i * .045}s`;
      e.target.style.animation = 'fadeUp .5s ease both';
      io.unobserve(e.target);
    }
  });
}, { threshold: .08 });

function observeCards() {
  document.querySelectorAll('.book-card').forEach(c => io.observe(c));
}

// ─── UTILITY ──────────────────────────────────
function $(id) { return document.getElementById(id); }
function enc(s) { return encodeURIComponent(s); }
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
function escHtml(s) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(s)));
  return d.innerHTML;
}

function toast(msg) {
  document.querySelector('.toast')?.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

function shake(el) {
  el.style.animation = 'none';
  void el.offsetHeight;
  el.style.animation = 'shake .35s ease';
  el.addEventListener('animationend', () => { el.style.animation = ''; }, { once: true });
}

// ─── BOOT ─────────────────────────────────────
loadSeedBooks().then(() => observeCards());
