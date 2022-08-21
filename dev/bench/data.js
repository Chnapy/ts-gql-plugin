window.BENCHMARK_DATA = {
  "lastUpdate": 1661096672177,
  "repoUrl": "https://github.com/Chnapy/ts-gql-plugin",
  "entries": {
    "\"with ts-gql-plugin\" vs \"without ts-gql-plugin\" Benchmark": [
      {
        "commit": {
          "author": {
            "name": "Chnapy",
            "username": "Chnapy"
          },
          "committer": {
            "name": "Chnapy",
            "username": "Chnapy"
          },
          "id": "8a6d1e59fe59476d2129fd8447f8bb1bfd638484",
          "message": "Fix diagnostics keeped on changes / add benchmark",
          "timestamp": "2022-06-15T13:57:54Z",
          "url": "https://github.com/Chnapy/ts-gql-plugin/pull/23/commits/8a6d1e59fe59476d2129fd8447f8bb1bfd638484"
        },
        "date": 1661094809464,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "performance impact %: \"with ts-gql-plugin\" vs \"without ts-gql-plugin\"",
            "value": 17.38,
            "range": "±1.99%",
            "unit": "%",
            "extra": "10 samples"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "richardhaddad@hotmail.fr",
            "name": "Richard Haddad",
            "username": "Chnapy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "462002c9fa69048f4c87ebb99f9de7a1b3de4b5b",
          "message": "Fix diagnostics keeped on changes / add benchmark (#23)\n\n* fix diagnostics not cleared on files updates\r\nadd tsc-ls\r\n\r\n* improve debug logger with log files generation\r\nadd debug time mesurement log\r\n\r\n* add benchmark\r\n\r\n* update README",
          "timestamp": "2022-08-21T17:42:09+02:00",
          "tree_id": "26eaccd87827cbe7513fc5d754519ff3a6c59580",
          "url": "https://github.com/Chnapy/ts-gql-plugin/commit/462002c9fa69048f4c87ebb99f9de7a1b3de4b5b"
        },
        "date": 1661096671762,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "performance impact %: \"with ts-gql-plugin\" vs \"without ts-gql-plugin\"",
            "value": 18.27,
            "range": "±1.25%",
            "unit": "%",
            "extra": "10 samples"
          }
        ]
      }
    ]
  }
}