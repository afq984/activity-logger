import {html, LitElement} from 'lit';
import {customElement, state} from 'lit/decorators.js';

import '@material/mwc-top-app-bar';
import '@material/mwc-button';

function initClient(): Promise<unknown> {
  return gapi.client.init({
    apiKey: 'AIzaSyDr0_ma9UGoiulRQbeCItpALn_Uh_2wph4',
    clientId:
      '119595275745-mu3mngo067mmrupnkel3kqr9pmabtsuu.apps.googleusercontent.com',
    discoveryDocs: [
      'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
    ],
    scope: [
      'https://www.googleapis.com/auth/calendar.app.created',
      'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
    ].join(' '),
  });
}

@customElement('activity-logger')
export class ActivityLogger extends LitElement {
  @state()
  ready = false;
  @state()
  signedIn = false;
  @state()
  authenticatedUser = '';

  override async connectedCallback() {
    super.connectedCallback();

    await new Promise((r) => gapi.load('client:auth2', r));
    await initClient();
    this.ready = true;
    this.updateAuthStatus();
  }

  override render() {
    return html`<mwc-top-app-bar>
      <div slot="title">Activity Logger</div>
      ${this.renderAuthButtons()}
    </mwc-top-app-bar>`;
  }

  updateAuthStatus() {
    const ai = gapi.auth2.getAuthInstance();
    this.signedIn = ai.isSignedIn.get();
    if (this.signedIn) {
      this.authenticatedUser = ai.currentUser
        .get()
        .getBasicProfile()
        .getEmail();
    }
  }

  async handleSignIn() {
    await gapi.auth2.getAuthInstance().signIn();
    this.updateAuthStatus();
  }

  async handleSignOut() {
    await gapi.auth2.getAuthInstance().signOut();
    this.updateAuthStatus();
  }

  renderAuthButtons() {
    if (!this.ready) {
      return html`<div slot="actionItems">Loading...</div>`;
    }
    if (this.signedIn) {
      return html`<div slot="actionItems">${this.authenticatedUser}</div>
        <mwc-button
          unelevated
          slot="actionItems"
          label="Sign Out"
          @click=${this.handleSignOut}
        ></mwc-button>`;
    }
    return html`<mwc-button
      unelevated
      slot="actionItems"
      label="Sign In"
      @click=${this.handleSignIn}
    ></mwc-button>`;
  }
}
