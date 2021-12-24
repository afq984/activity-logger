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
import '@material/mwc-tab-bar';
import '@material/mwc-tab';

const CLIENT_ID =
  '119595275745-mlikf6ulktg85dcjommjeqf53s9ilbmm.apps.googleusercontent.com';
const REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/calendar.app.created',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
];

function initClient(): Promise<unknown> {
  return gapi.client.init({
    apiKey: 'AIzaSyDr0_ma9UGoiulRQbeCItpALn_Uh_2wph4',
    clientId: CLIENT_ID,
    discoveryDocs: [
      'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
    ],
    scope: REQUIRED_SCOPES.join(' '),
  });
}

function allPermissionsAvailable(user: gapi.auth2.GoogleUser) {
  const grantedScopes: Record<string, boolean> = {};
  for (const scope of user.getGrantedScopes().split(' ')) {
    grantedScopes[scope] = true;
  }
  for (const scope of REQUIRED_SCOPES) {
    if (!grantedScopes[scope]) {
      return false;
    }
  }
  return true;
}

@customElement('activity-logger')
export class ActivityLogger extends LitElement {
  @state()
  ready = false;
  @state()
  signedIn = false;
  @state()
  authenticatedUser = '';
  @state()
  allPermissionsAvailable = false;

  static override styles = css`
    main {
      margin: 20px;
    }
  `;

  override async connectedCallback() {
    super.connectedCallback();

    await new Promise((r) => gapi.load('client:auth2', r));
    await initClient();
    const user = gapi.auth2.getAuthInstance().currentUser;
    user.listen((user) => this.updateAuthStatus(user));
    this.updateAuthStatus(user.get());
    this.ready = true;
  }

  override render() {
    return html`
      <mwc-top-app-bar>
        <div slot="title">Activity Logger</div>
        ${this.renderAuthButtons()}
      </mwc-top-app-bar>
      <main>${this.renderForm()}</main>
    `;
  }

  updateAuthStatus(user: gapi.auth2.GoogleUser) {
    if (user.isSignedIn()) {
      this.signedIn = true;
      this.authenticatedUser = user.getBasicProfile().getEmail();
      this.allPermissionsAvailable = allPermissionsAvailable(user);
    } else {
      this.signedIn = false;
      this.authenticatedUser = '';
      this.allPermissionsAvailable = false;
    }
  }

  async handleSignIn() {
    await gapi.auth2.getAuthInstance().signIn();
  }

  async handleSignOut() {
    await gapi.auth2.getAuthInstance().signOut();
  }

  renderAuthButtons() {
    if (!this.ready) {
      return html`<div slot="actionItems">Loading...</div>`;
    }
    if (this.signedIn) {
      return html`<mwc-button
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
      if (this.allPermissionsAvailable) {
        return html`<activity-form
          authenticatedUser=${this.authenticatedUser}
        ></activity-form>`;
      }
      return html`<p>Insufficient permissions.</p>
        <mwc-button
          outlined
          @click=${this.handleSignIn}
          label="Authorize"
        ></mwc-button>`;
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
  @property()
  authenticatedUser = '';

  static displayModes = ['All', 'Unique'];
  @state()
  activeDisplayMode = 'All';

  static override styles = css`
    mwc-button {
      vertical-align: baseline;
    }
    mwc-circular-progress {
      vertical-align: bottom;
    }
    .long {
      word-break: break-all;
    }
    mwc-tab-bar {
      margin-top: 10px;
    }
    h3 {
      font-weight: 400;
    }
    mwc-button {
      margin-left: 4px;
    }
  `;

  override async connectedCallback() {
    super.connectedCallback();

    this.calendarId = await getOrCreateActivityCalendar('Activity Log');
    this.loadRecentEvents();
  }

  override render() {
    if (!this.calendarId) {
      return html`Loading...`;
    }
    return html`
      <p>Logged in as: ${this.authenticatedUser}</p>
      <p>Using calendar: <span class="long">${this.calendarId}</span></p>
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

      <h3>Recent Events</h3>
      <mwc-tab-bar @MDCTabBar:activated=${this.handleTabBarActivated}>
        ${ActivityForm.displayModes.map(
          (mode) => html`<mwc-tab label=${mode}></mwc-tab>`
        )}
      </mwc-tab-bar>
      ${this.renderRecentEvents()}
    `;
  }

  handleTextFieldKeyUp(e: KeyboardEvent) {
    if (e.key === 'Enter') {
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
    this.textField.value = this.eventsToDisplay()[e.detail.index].summary || '';
  }

  handleTabBarActivated(e: CustomEvent) {
    this.activeDisplayMode = ActivityForm.displayModes[e.detail.index];
  }

  eventsToDisplay() {
    if (this.activeDisplayMode === 'Unique') {
      const seen: Record<string, boolean> = {};
      return this.recentEvents.filter((e) => {
        if (!e.summary || seen[e.summary]) {
          return false;
        }
        seen[e.summary] = true;
        return true;
      });
    }
    return this.recentEvents;
  }

  renderRecentEvents() {
    return html`<mwc-list @selected=${this.handleSelected}>
      ${this.eventsToDisplay().map(
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
