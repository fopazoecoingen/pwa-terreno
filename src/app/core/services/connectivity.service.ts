import { Injectable, computed } from '@angular/core';
import { fromEvent, merge, of } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';

@Injectable({ providedIn: 'root' })
export class ConnectivityService {
  private readonly online$ = merge(
    fromEvent(window, 'online').pipe(map(() => true)),
    fromEvent(window, 'offline').pipe(map(() => false)),
    of(navigator.onLine),
  ).pipe(startWith(navigator.onLine));

  readonly online = toSignal(this.online$, { initialValue: navigator.onLine });
  readonly offline = computed(() => !this.online());
}
