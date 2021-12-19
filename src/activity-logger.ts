import {html, LitElement} from 'lit';
import {customElement} from 'lit/decorators.js';

@customElement('activity-logger')
export class ActivityLogger extends LitElement {
  override render() {
    return html`<p>hello world</p>`;
  }
}
