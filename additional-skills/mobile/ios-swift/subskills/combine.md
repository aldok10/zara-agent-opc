---
type: subskill
title: "Combine"
---

# Combine

## Core Concepts

- Combine is Apple's reactive framework: Publishers emit values over time, Subscribers receive them
- Operators transform, filter, and combine streams declaratively (map, filter, combineLatest, merge)
- Subscriptions are reference-counted: store in AnyCancellable sets to keep them alive
- Backpressure: subscribers control demand  -  publishers don't overwhelm slow consumers
- Combine integrates deeply with SwiftUI (@Published), URLSession, NotificationCenter, and KVO

## Key Practices

- Use @Published in ObservableObjects to drive SwiftUI updates reactively
- Chain operators for data transformation: debounce for search, removeDuplicates for efficiency
- Use combineLatest/zip to merge multiple data sources into a single stream
- Handle errors with replaceError, catch, or retry  -  don't let errors terminate the pipeline
- Store cancellables in a Set<AnyCancellable> tied to the object's lifecycle

## Common Mistakes

- Not storing the AnyCancellable: subscription immediately cancels and nothing happens
- Using sink without [weak self]: creates retain cycles that leak memory
- Over-chaining operators into unreadable pipelines  -  extract intermediate publishers

## When to Apply

- Reacting to multiple changing inputs that combine to produce a result
- Debouncing user input (search-as-you-type, form validation)
- Bridging imperative APIs (NotificationCenter, delegates) into reactive streams
- Managing complex async flows before Swift concurrency adoption (or alongside it)
