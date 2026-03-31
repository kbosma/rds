import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  getAll<T>(endpoint: string): Observable<T[]> {
    return this.http.get<T[]>(`/api/${endpoint}`);
  }

  getById<T>(endpoint: string, id: string): Observable<T> {
    return this.http.get<T>(`/api/${endpoint}/${id}`);
  }
}
