/* ================================================================
   SEC·ATLAS · components.js
   可复用 Web Components（自定义元素）:
     <t-card>  名词卡（可折叠）
     <s-view>  安全视角提示块
     <q-item>  自测卡（点击揭晓答案）
     <c-block> 代码块（带复制按钮）
   依赖: utils.js（iconSVG）
   ================================================================ */
"use strict";

/* ---- 名词卡 <t-card term="..." full="..."> ---- */
class TermCard extends HTMLElement{
  connectedCallback(){
    if(this.dataset.ready) return;
    this.dataset.ready = "1";
    const term = this.getAttribute("term") || "";
    const full = this.getAttribute("full") || "";
    /* 正文优先取 innerHTML；若为空则回退到 def 属性（兼容单行写法） */
    const inner = this.innerHTML.trim() || (this.getAttribute("def") || "").trim();
    this.classList.add("tcard");
    this.innerHTML = `
      <div class="tcard-head">
        <span class="tk">名词</span>
        <span class="tname">${term}</span>
        ${full ? `<span class="tfull">${full}</span>` : ""}
        <span class="chev">${iconSVG("activity",13)}</span>
      </div>
      <div class="tcard-body"><div><p>${inner}</p></div></div>`;
    $(".tcard-head", this).addEventListener("click", () => this.classList.toggle("open"));
  }
}
customElements.define("t-card", TermCard);

/* ---- 安全视角 <s-view title="..."> ---- */
class SecView extends HTMLElement{
  connectedCallback(){
    if(this.dataset.ready) return;
    this.dataset.ready = "1";
    const title = this.getAttribute("title") || "安全视角";
    const inner = this.innerHTML.trim();
    this.classList.add("sview");
    this.innerHTML = `
      <div class="sview-head">${iconSVG("alert",14)}<span>安全视角</span><span class="stitle">/ ${title}</span></div>
      <div class="sview-body">${inner}</div>`;
  }
}
customElements.define("s-view", SecView);

/* ---- 自测卡 <q-item no="Q1" q="..."> ---- */
class QuizItem extends HTMLElement{
  connectedCallback(){
    if(this.dataset.ready) return;
    this.dataset.ready = "1";
    const no = this.getAttribute("no") || "?";
    const q = this.getAttribute("q") || "";
    const inner = this.innerHTML.trim();
    this.classList.add("qz");
    this.innerHTML = `
      <div class="qz-head">
        <span class="qz-no">${no}</span>
        <div class="qz-q">${q}</div>
        <span class="qz-hint">REVEAL ▾</span>
      </div>
      <div class="qz-body"><div><div class="qz-a">${inner}</div></div></div>`;
    $(".qz-head", this).addEventListener("click", () => this.classList.toggle("open"));
  }
}
customElements.define("q-item", QuizItem);

/* ---- 代码块 <c-block lang="bash" title="..."> ---- */
class CodeBlock extends HTMLElement{
  connectedCallback(){
    if(this.dataset.ready) return;
    this.dataset.ready = "1";
    const lang = this.getAttribute("lang") || "";
    const title = this.getAttribute("title") || lang;
    const code = this.innerHTML.trim();
    this.classList.add("cblk");
    this.innerHTML = `
      <div class="cblk-head">
        <span class="lang">${lang}</span><span class="cl">${title}</span>
        <button class="copy-btn">${iconSVG("copy",12)}复制</button>
      </div>
      <pre><code>${code}</code></pre>`;
    $(".copy-btn", this).addEventListener("click", async (e) => {
      const btn = e.currentTarget;
      try{ await navigator.clipboard.writeText($("pre", this).textContent); }catch(_){}
      btn.classList.add("done");
      btn.innerHTML = iconSVG("check",12) + "已复制";
      setTimeout(() => {
        btn.classList.remove("done");
        btn.innerHTML = iconSVG("copy",12) + "复制";
      }, 1600);
    });
  }
}
customElements.define("c-block", CodeBlock);
