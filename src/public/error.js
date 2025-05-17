const errorContainer = document.querySelector('.error-container');
const sourceCode = document.querySelector('.source-code-container');
const errorLine = sourceCode.querySelector('.error-line-container .line-number.active');
const resizeHandlers = document.querySelectorAll('.resize-handle');

errorLine.scrollIntoView();

const minWidth = errorContainer.clientWidth;
// 10 padding on sides
const maxWidth = window.innerWidth - 20;

resizeHandlers.forEach((resizer) => {
  resizer.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = errorContainer.offsetWidth;
    const isLeft = resizer.classList.contains('left');

    const onMouseMove = (event) => {
      const dx = event.clientX - startX;
      const newWidth = isLeft ? startWidth - dx : startWidth + dx;
      if (newWidth < minWidth) return;
      if (newWidth > maxWidth) return;

      errorContainer.style.width = `${newWidth}px`;
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
});
