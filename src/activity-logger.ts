import {css, html, LitElement} from 'lit';
import {customElement, state, property, query} from 'lit/decorators.js';

import '@material/mwc-top-app-bar';
import '@material/mwc-button';
import '@material/mwc-textfield';
import {TextField} from '@material/mwc-textfield';
import '@material/mwc-list/mwc-list';
import '@material/mwc-list/mwc-list-item';
import '@material/mwc-circular-progress';
import {SingleSelectedEvent} from '@material/mwc-list/mwc-list';

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
    return html`
      <mwc-top-app-bar>
        <div slot="title">Activity Logger</div>
        ${this.renderAuthButtons()}
      </mwc-top-app-bar>
      ${this.renderForm()}
    `;
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

  renderForm() {
    if (this.signedIn) {
      return html`<activity-form></activity-form>`;
    }
    return undefined;
  }
}

async function getActivityCalendar(
  calendarSummary: string
): Promise<string | null> {
  const response = await gapi.client.calendar.calendarList.list();
  for (const item of response.result.items || []) {
    if (calendarSummary === item.summary && item.id) {
      return item.id;
    }
  }
  return null;
}

async function createActivityCalendar(
  calendarSummary: string
): Promise<string> {
  const calendar: gapi.client.calendar.Calendar = {
    summary: calendarSummary,
  };
  const response = await gapi.client.calendar.calendars.insert({
    resource: calendar,
  });
  return response.result.id!;
}

async function getOrCreateActivityCalendar(
  calendarSummary: string
): Promise<string> {
  return (
    (await getActivityCalendar(calendarSummary)) ||
    (await createActivityCalendar(calendarSummary))
  );
}

async function logActivity(calendarId: string, summary: string) {
  const now = new Date();
  const event: gapi.client.calendar.Event = {
    summary: summary,
    start: {
      dateTime: now.toISOString(),
    },
    end: {
      dateTime: now.toISOString(),
    },
  };
  const response = await gapi.client.calendar.events.insert({
    calendarId,
    resource: event,
  });
  console.log(response);
}

function pad2(n: number) {
  return n.toLocaleString('en-US', {
    minimumIntegerDigits: 2,
    useGrouping: false,
  });
}

function isoToLocal(isoDate?: string) {
  if (!isoDate) {
    return 'unknown';
  }
  const d = new Date(isoDate);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(
    d.getDate()
  )} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

@customElement('activity-form')
export class ActivityForm extends LitElement {
  @property()
  calendarId?: string;
  @query('#activity')
  textField!: TextField;
  @state()
  recentEvents: Array<gapi.client.calendar.Event> = [];
  @state()
  submitIsRunning = false;

  static override styles = css`
    main {
      margin: 20px;
    }
    mwc-button {
      vertical-align: baseline;
    }
    mwc-circular-progress {
      vertical-align: bottom;
    }
  `;

  override async connectedCallback() {
    super.connectedCallback();

    this.calendarId = await getOrCreateActivityCalendar('Activity Log');
    this.loadRecentEvents();
  }

  override render() {
    if (!this.calendarId) {
      return html`<main>Loading...</main>`;
    }
    return html`<main>
      <p>Using calendar: ${this.calendarId}</p>
      <div>
        <mwc-textfield
          id="activity"
          label="Activity"
          ?disabled=${this.submitIsRunning}
          @keyup=${this.handleTextFieldKeyUp}
        ></mwc-textfield>
        <mwc-button
          outlined
          label="Submit"
          ?disabled=${this.submitIsRunning}
          @click=${this.handleSubmit}
        ></mwc-button>
        ${this.submitIsRunning
          ? html`<mwc-circular-progress indeterminate></mwc-circular-progress>`
          : undefined}
      </div>
      ${this.renderRecentEvents()}
    </main>`;
  }

  handleTextFieldKeyUp(e: KeyboardEvent) {
    if (e.code == 'Enter') {
      this.handleSubmit();
    }
  }

  async handleSubmit() {
    if (this.calendarId) {
      this.submitIsRunning = true;
      await logActivity(this.calendarId, this.textField.value);
      await this.loadRecentEvents();
      this.submitIsRunning = false;
    }
  }

  handleSelected(e: SingleSelectedEvent) {
    this.textField.value = this.recentEvents[e.detail.index].summary || '';
  }

  renderRecentEvents() {
    return html`<mwc-list @selected=${this.handleSelected}>
      ${this.recentEvents.map(
        (event) =>
          html`<mwc-list-item twoline>
            <span>${event.summary}</span>
            <span slot="secondary">${isoToLocal(event.start?.dateTime)}</span>
          </mwc-list-item>`
      )}
    </mwc-list>`;
  }

  async loadRecentEvents() {
    if (!this.calendarId) {
      return;
    }
    const timeMin = new Date();
    timeMin.setDate(timeMin.getDate() - 28);
    const response = await gapi.client.calendar.events.list({
      calendarId: this.calendarId,
      orderBy: 'startTime',
      timeMin: timeMin.toISOString(),
      singleEvents: true,
    });
    const items = response.result.items;
    if (items) {
      this.recentEvents = items.reverse();
      this.requestUpdate();
    }
  }
}
