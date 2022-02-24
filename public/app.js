function strToDom(str) {
  return document.createRange().createContextualFragment(str).firstChild;
}

class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  toSvgPath() {
    return `${this.x} ${this.y}`;
  }

  static fromAngle(angle) {
    return new Point(Math.cos(angle), Math.sin(angle));
  }
}

/**
 * @property {number[]} data
 * @property {SVGPathElement[]} paths
 */
class PieChart extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });
    const gap = this.getAttribute("gap") ?? "0";
    const donut = this.getAttribute("donut") ?? "0";
    const colors = this.getAttribute("colors").split(";") ?? [
      "#55095c",
      "#7e025f",
      "#a3075c",
      "#c42054",
      "#df3e48",
      "#f25f39",
      "#fd8224",
      "#ffa600",
    ];
    const labels = this.getAttribute("labels").split(";") ?? [];
    const svg = strToDom(`<svg viewBox="-1 -1 2 2">
      <g mask="url(#graphMask)"></g>
      <mask id="graphMask">
        <rect fill="#fff" x="-1" y="-1" width="2" height="2" />
        <circle fill="#000" r="${donut}"
      </mask>
    </svg>`);
    const pathGroup = svg.querySelector("g");
    const maskGroup = svg.querySelector("mask");

    this.data = this.getAttribute("data")
      .split(";")
      .map(v => parseFloat(v));

    this.paths = this.data.map((_, index) => {
      const color = colors[index % colors.length];
      const uiPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      uiPath.setAttribute("fill", color);
      uiPath.addEventListener("mouseover", () => this.handlePathHover(index));
      uiPath.addEventListener("mouseout", () => this.handlePathOut(index));
      pathGroup.appendChild(uiPath);
      return uiPath;
    });

    this.lines = this.data.map(_ => {
      const uiLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
      uiLine.setAttribute("stroke", "#000");
      uiLine.setAttribute("stroke-width", gap);
      uiLine.setAttribute("x1", "0");
      uiLine.setAttribute("y1", "0");
      maskGroup.appendChild(uiLine);
      return uiLine;
    });

    this.labels = labels.map(label => {
      const uiLabel = document.createElement("div");
      uiLabel.className = "label";
      uiLabel.innerText = label;
      shadow.appendChild(uiLabel);
      return uiLabel;
    });

    const style = document.createElement("style");
    style.innerHTML = `
    :host {
      display: block;
      position: relative;
    }
    svg {
      width: 100%;
      height: 100%;
    }
    path {
      cursor: pointer;
      transition: opacity .3s;
    }
    path:hover {
      opacity: .5;
    }
    .label {
      position: absolute;
      top: 0;
      left: 0;
      font-size: .8rem;
      padding: .1em .2em;
      transform: translate(-50%, -50%);
      background-color: var(--tooltip-bg, #FFF);
      opacity: 0;
      transition: opacity .3s;
      pointer-events: none;
    }
    .is-active {
      opacity: 1;
    }
    `;
    shadow.appendChild(style);
    shadow.appendChild(svg);
  }

  connectedCallback() {
    const now = Date.now();
    const duration = 1000;
    const draw = () => {
      const t = (Date.now() - now) / duration;
      if (t < 1) {
        this.draw(t);
        window.requestAnimationFrame(draw);
      } else {
        this.draw(1);
      }
    };
    window.requestAnimationFrame(draw);
  }

  draw(progress = 1) {
    const total = this.data.reduce((acc, v) => acc + v);
    let angle = Math.PI / -2;
    let start = new Point(0, -1);

    this.data.forEach((value, index) => {
      const ratio = (value / total) * progress;
      if (progress === 1) this.positionLabel(this.labels[index], angle + ratio * Math.PI);
      angle += ratio * 2 * Math.PI;
      const end = Point.fromAngle(angle);
      const largeFlag = ratio > 0.5 ? "1" : "0";
      this.paths[index].setAttribute(
        "d",
        `M 0 0 L ${start.toSvgPath()} A 1 1 0 ${largeFlag} 1 ${end.toSvgPath()} L 0 0`
      );
      this.lines[index].setAttribute("x2", end.x);
      this.lines[index].setAttribute("y2", end.y);
      start = end;
    });
  }

  /**
   * Show label
   * @param {number} index
   */
  handlePathHover(index) {
    this.dispatchEvent(new CustomEvent("sectionhover", { detail: index }));
    this.labels[index]?.classList.add("is-active");
  }

  /**
   * Hide label
   * @param {number} index
   */
  handlePathOut(index) {
    this.labels[index]?.classList.remove("is-active");
  }

  /**
   *  Set label position
   * @param {HTMLDivElement|undefined} label
   * @param {number} angle
   */
  positionLabel(label, angle) {
    if (!label || !angle) return;
    const point = Point.fromAngle(angle);
    label.style.setProperty("top", `${(point.y * 0.8 * 0.5 + 0.5) * 100}%`);
    label.style.setProperty("left", `${(point.x * 0.8 * 0.5 + 0.5) * 100}%`);
  }
}

customElements.define("pie-chart", PieChart);
