import { gql } from 'graphql-tag';
import { useQuery } from '@apollo/client';

const { data: abc } = useQuery(
  gql(`#graphql
  query User1($id: ID!) {
    user(id: $id) {
      id
      name
  }
    users {
      id
    }
  }
`)
);

const { data } = useQuery(
  gql(`#graphql
  query User2($id: ID!) {
    user(id: $id) {
      id
      name
    }
    users {
      id
    }
  }
`)
);

const { data: foo } = useQuery(
  gql(`#graphql
  query User3($id: ID!) {
    user(id: $id) {
      id
      name
    }
    users {
      id
    }
  }
`)
);

const { data: azer } = useQuery(
  gql(`#graphql
  query User4($id: ID!) {
    authByGoogle(code: "foo") {
      id
      accessToken
    }
    user(id: $id) {
      id
      name
    }
    users {
      id
    }
  }
`)
);

console.log(abc?.user.name);
console.log(data?.user.name);
console.log(foo?.users[0].id);
console.log(azer?.authByGoogle.accessToken);
