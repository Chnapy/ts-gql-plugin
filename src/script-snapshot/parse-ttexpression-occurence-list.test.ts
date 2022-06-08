import {
  parseTTExpressionOccurenceList,
  TTExpressionOccurence,
} from './parse-ttexpression-occurence-list';
import { formatTS } from './test-utils';

describe('Parse TTExpression occurence list', () => {
  it('parse TTExpression occurence list', () => {
    const code = `
import { VendorProductListItem } from 'web-client/components/organisms';
import { CartItemRemoved } from 'web-client/components/organisms/cart/cartList/CartItemRemoved';
import { useCart } from 'web-client/components/organisms/cart/hooks/UseCart';
import { ProductFromVendorProductContextProvider } from 'web-client/components/organisms/product/context/ProductContext';
import { VendorProductContextProvider } from 'web-client/components/organisms/product/context/VendorProductContext';
import { useTranslate } from '@reparcar/translation';
import React from 'react';
import { IRIUtils } from '@reparcar/common';
import BottomText from '../bottomText/BottomText';
import { EmptyCart } from '../emptyCart/EmptyCart';
import styles from './CartList.module.scss';
import { useOrderCartItemDeleteMutation, refetchOrderCartQuery } from '@reparcar/network-order';
import { useGraphQLArray } from '@reparcar/network-utils';
import { Spinner } from '@reparcar/ui';
import { useCartPrice } from 'web-client/components/organisms/cart/hooks/UseCartPrice';

export const CartList: React.FC = () => {
  const { t } = useTranslate();
  const { data: cartData, loading } = useQuery(gql\`
    query User($id: ID!) {
      user(id: $id) {
        id
        name
      }
      users {
        id
        email
      }
    }
  \`);
  const cartItems = useGraphQLArray(cartData?.cartItems);
  const [deleteCartItem] = useOrderCartItemDeleteMutation(
    gql\`
      mutation UserDelete($id: ID!) {
        user(id: $id) {
          id
          name
        }
      }
    \`, {
      refetchQueries: [
        refetchOrderCartQuery({
          token: cartData?.token,
        }),
      ],
      awaitRefetchQueries: true,
    });
  const [removedVendorProductId, setRemovedVendorProductId] = React.useState<string | null>(null);
  const cartPrice = useCartPrice();

  return (
    <div>
      {removedVendorProductId && (
        <VendorProductContextProvider value={removedVendorProductId}>
          <ProductFromVendorProductContextProvider>
            <CartItemRemoved />
          </ProductFromVendorProductContextProvider>
        </VendorProductContextProvider>
      )}
      {loading ? <Spinner /> : <div>foo</div>}
      <BottomText />
    </div>
  );
};

export default CartList;
    `;

    expect(
      parseTTExpressionOccurenceList(code).map(({ content, position }) => ({
        content: formatTS(content),
        position,
      }))
    ).toEqual<TTExpressionOccurence[]>([
      {
        position: 1168,
        content: formatTS(`gql\`
          query User($id: ID!) {
            user(id: $id) {
              id
              name
            }
            users {
              id
              email
            }
          }
        \``),
      },
      {
        position: 1434,
        content: formatTS(`gql\`
          mutation UserDelete($id: ID!) {
            user(id: $id) {
              id
              name
            }
          }
        \``),
      },
    ]);
  });

  it('ignores AsExpressions', () => {
    const code = `
import { VendorProductListItem } from 'web-client/components/organisms';
import { CartItemRemoved } from 'web-client/components/organisms/cart/cartList/CartItemRemoved';
import { useCart } from 'web-client/components/organisms/cart/hooks/UseCart';
import { ProductFromVendorProductContextProvider } from 'web-client/components/organisms/product/context/ProductContext';
import { VendorProductContextProvider } from 'web-client/components/organisms/product/context/VendorProductContext';
import { useTranslate } from '@reparcar/translation';
import React from 'react';
import { IRIUtils } from '@reparcar/common';
import BottomText from '../bottomText/BottomText';
import { EmptyCart } from '../emptyCart/EmptyCart';
import styles from './CartList.module.scss';
import { useOrderCartItemDeleteMutation, refetchOrderCartQuery } from '@reparcar/network-order';
import { useGraphQLArray } from '@reparcar/network-utils';
import { Spinner } from '@reparcar/ui';
import { useCartPrice } from 'web-client/components/organisms/cart/hooks/UseCartPrice';

export const CartList: React.FC = () => {
  const { t } = useTranslate();
  const { data: cartData, loading } = useQuery(gql\`
    query User($id: ID!) {
      user(id: $id) {
        id
        name
      }
      users {
        id
        email
      }
    }
  \` as any);
  const cartItems = useGraphQLArray(cartData?.cartItems);
  const [deleteCartItem] = useOrderCartItemDeleteMutation(
    gql\`
      mutation UserDelete($id: ID!) {
        user(id: $id) {
          id
          name
        }
      }
    \`, {
      refetchQueries: [
        refetchOrderCartQuery({
          token: cartData?.token,
        }),
      ],
      awaitRefetchQueries: true,
    });
  const [removedVendorProductId, setRemovedVendorProductId] = React.useState<string | null>(null);
  const cartPrice = useCartPrice();

  return (
    <div>
      {removedVendorProductId && (
        <VendorProductContextProvider value={removedVendorProductId}>
          <ProductFromVendorProductContextProvider>
            <CartItemRemoved />
          </ProductFromVendorProductContextProvider>
        </VendorProductContextProvider>
      )}
      {loading ? <Spinner /> : <div>foo</div>}
      <BottomText />
    </div>
  );
};

export default CartList;
    `;

    expect(
      parseTTExpressionOccurenceList(code).map(({ content, position }) => ({
        content: formatTS(content),
        position,
      }))
    ).toEqual<TTExpressionOccurence[]>([
      {
        position: 1441,
        content: formatTS(`gql\`
          mutation UserDelete($id: ID!) {
            user(id: $id) {
              id
              name
            }
          }
        \``),
      },
    ]);
  });
});
