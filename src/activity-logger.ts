import {html, LitElement} from 'lit';
import {customElement} from 'lit/decorators.js';
import '@material/mwc-top-app-bar';

@customElement('activity-logger')
export class ActivityLogger extends LitElement {
  override render() {
    return html`<mwc-top-app-bar>
      <div slot="title">Activity Logger</div>
    </mwc-top-app-bar>`;
  }
}
