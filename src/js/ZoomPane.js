import throwIfMissing from './util/throwIfMissing';
import { addClasses, removeClasses } from './util/dom';

// All officially-supported browsers have this, but it's easy to
// account for, just in case.
const HAS_ANIMATION = 'animation' in document.body.style;

export default class ZoomPane {
  constructor(options = {}) {
    this.isShowing = false;

    let {
      container = null,
      zoomFactor = throwIfMissing(),
      inline = throwIfMissing(),
      namespace = null,
      showWhitespaceAtEdges = throwIfMissing(),
      containInline = throwIfMissing(),
      inlineOffsetX = 0,
      inlineOffsetY = 0,
    } = options;

    this.settings = { container, zoomFactor, inline, namespace, showWhitespaceAtEdges, containInline, inlineOffsetX, inlineOffsetY };
    this.settings.inlineContainer = document.body;

    this.openClasses = this._buildClasses('open');
    this.openingClasses = this._buildClasses('opening');
    this.closingClasses = this._buildClasses('closing');
    this.inlineClasses = this._buildClasses('inline');


    this._buildElement();
  }

  _buildClasses(suffix) {
    let classes = [`drift-${suffix}`];

    let ns = this.settings.namespace;
    if (ns) {
      classes.push(`${ns}-${suffix}`);
    }

    return classes;
  }

  _buildElement() {
    this.el = document.createElement('div');
    addClasses(this.el, this._buildClasses('zoom-pane'));

    this.imgEl = document.createElement('img');
    this.el.appendChild(this.imgEl);
  }

  _setImageURL(imageURL) {
    this.imgEl.setAttribute('src', imageURL);
  }

  _setImageSize(triggerWidth) {
    this.imgEl.style.width = `${triggerWidth * this.settings.zoomFactor}px`;
  }

  // `percentageOffsetX` and `percentageOffsetY` must be percentages
  // expressed as floats between `0' and `1`.
  setPosition(percentageOffsetX, percentageOffsetY, triggerWidth, triggerHeight, triggerRect) {
    let left = -(this.imgEl.clientWidth * percentageOffsetX - (this.el.clientWidth / 2));
    let top = -(this.imgEl.clientHeight * percentageOffsetY - (this.el.clientHeight / 2));
    let maxLeft = -(this.imgEl.clientWidth - this.el.clientWidth);
    let maxTop = -(this.imgEl.clientHeight - this.el.clientHeight);

    if (this.el.parentElement === this.settings.inlineContainer) {
      let inlineLeft = triggerRect.left + (percentageOffsetX * triggerWidth)
        - (this.el.clientWidth / 2) + this.settings.inlineOffsetX;
      let inlineTop = triggerRect.top + (percentageOffsetY * triggerHeight)
        - (this.el.clientHeight / 2) + this.settings.inlineOffsetY;

      if (this.settings.containInline) {
        let elRect = this.el.getBoundingClientRect();

        if (inlineLeft < triggerRect.left) {
          inlineLeft = triggerRect.left;
        } else if (inlineLeft + this.el.clientWidth > triggerRect.left + triggerWidth) {
          inlineLeft = triggerRect.left + triggerWidth - this.el.clientWidth;
        }

        if (inlineTop < triggerRect.top) {
          inlineTop = triggerRect.top;
        } else if (inlineTop + this.el.clientHeight > triggerRect.top + triggerHeight) {
          inlineTop = triggerRect.top + triggerHeight - this.el.clientHeight;
        }
      }

      this.el.style.left = `${inlineLeft}px`;
      this.el.style.top = `${inlineTop}px`;
    }

    if (!this.settings.showWhitespaceAtEdges) {
      if (left > 0) {
        left = 0;
      } else if (left < maxLeft) {
        left = maxLeft;
      }

      if (top > 0) {
        top = 0;
      } else if (top < maxTop) {
        top = maxTop;
      }
    }

    this.imgEl.style.transform = `translate(${left}px, ${top}px)`;
  }

  get _isInline() {
    let inline = this.settings.inline;

    return inline === true || (typeof inline === 'number' && window.innerWidth <= inline);
  }

  show(imageURL, triggerWidth) {
    this.isShowing = true;

    addClasses(this.el, this.openClasses);

    this._setImageURL(imageURL);
    this._setImageSize(triggerWidth);

    if (this._isInline) {
      this._showInline();
    } else {
      this._showInContainer();
    }

    if (HAS_ANIMATION) {
      this.el.addEventListener('animationend', this._completeShow, false);
      addClasses(this.el, this.openingClasses);
    }
  }

  _showInline() {
    this.settings.inlineContainer.appendChild(this.el);
    addClasses(this.el, this.inlineClasses);
  }

  _showInContainer() {
    this.settings.container.appendChild(this.el);
  }

  hide() {
    this.isShowing = false;

    if (HAS_ANIMATION) {
      this.el.addEventListener('animationend', this._completeHide, false);
      addClasses(this.el, this.closingClasses);
    } else {
      removeClasses(this.el, this.openClasses);
    }
  }

  _completeShow = () => {
    this.el.removeEventListener('animationend', this._completeShow, false);

    removeClasses(this.el, this.openingClasses);
  }

  _completeHide = () => {
    this.el.removeEventListener('animationend', this._completeHide, false);

    removeClasses(this.el, this.openClasses);
    removeClasses(this.el, this.closingClasses);
    removeClasses(this.el, this.inlineClasses);

    this.el.setAttribute('style', '');

    // The window could have been resized above or below `inline`
    // limits since the ZoomPane was shown. Because of this, we
    // can't rely on `this._isInline` here.
    if (this.el.parentElement === this.settings.container) {
      this.settings.container.removeChild(this.el);
    } else if (this.el.parentElement === this.settings.inlineContainer) {
      this.settings.inlineContainer.removeChild(this.el);
    }
  }
}
