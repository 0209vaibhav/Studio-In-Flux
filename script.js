// Set current date in the article
const dateElem = document.getElementById('date');
if (dateElem) {
  const now = new Date();
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  dateElem.textContent = now.toLocaleDateString(undefined, options);
}

// Allow author name editing on click (optional, modern touch)
const authorElem = document.getElementById('author');
if (authorElem) {
  authorElem.addEventListener('click', () => {
    const newName = prompt('Edit author name:', authorElem.textContent);
    if (newName) authorElem.textContent = newName;
  });
  authorElem.style.cursor = 'pointer';
  authorElem.title = 'Click to edit author name';
}

// Nav link active state (scroll and click, like Machine-Learning_MEMENTO)
document.addEventListener('DOMContentLoaded', function() {
  const navLinks = document.querySelectorAll('.article-nav a');
  // Click: set active
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      navLinks.forEach(l => l.classList.remove('active'));
      this.classList.add('active');
    });
  });
  // Scroll: set active based on section in view
  window.addEventListener('scroll', function() {
    const sections = document.querySelectorAll('section[id]');
    const scrollPosition = window.scrollY;
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 100;
      const sectionBottom = sectionTop + section.offsetHeight;
      const sectionId = section.getAttribute('id');
      if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
        navLinks.forEach(link => link.classList.remove('active'));
        const activeLink = document.querySelector(`.article-nav a[href="#${sectionId}"]`);
        if (activeLink) activeLink.classList.add('active');
      }
    });
  });
});
