// Heading anchor links for blog posts and guides
(function () {
  var containers = document.querySelectorAll('.post-content, .guide-article');

  containers.forEach(function (container) {
    container.querySelectorAll('h2, h3').forEach(function (heading) {
      if (!heading.id) return;

      var link = document.createElement('a');
      link.className = 'heading-anchor';
      link.href = '#' + heading.id;
      link.setAttribute('aria-label', 'Link to this section');
      link.textContent = '#';

      link.addEventListener('click', function (e) {
        e.preventDefault();
        var url = window.location.origin + window.location.pathname + '#' + heading.id;
        history.replaceState(null, '', '#' + heading.id);
        navigator.clipboard.writeText(url);

        // Brief visual feedback
        link.classList.add('anchor-copied');
        setTimeout(function () {
          link.classList.remove('anchor-copied');
        }, 1500);
      });

      heading.style.position = 'relative';
      heading.insertBefore(link, heading.firstChild);
    });
  });
})();
