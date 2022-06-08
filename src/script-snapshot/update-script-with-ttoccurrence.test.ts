import { TTExpressionOccurence } from './parse-ttexpression-occurence-list';
import { formatTS } from './test-utils';
import {
  DraftScript,
  updateScriptWithTTOccurence,
} from './update-script-with-ttoccurrence';

describe('Update script with TTExpressionOccurrence', () => {
  it('update script correctly', () => {
    const expression1 = `gql\`
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
    \``;

    const expression2 = `gql\`
      mutation UserDelete($id: ID!) {
        user(id: $id) {
          id
          name
        }
      }
    \``;

    const code = `
import React from 'react';
import { useCartPrice } from 'web-client/components/organisms/cart/hooks/UseCartPrice';

export const CartList: React.FC = () => {
  const { t } = useTranslate();
  const { data: cartData, loading } = useQuery(${expression1});
  const cartItems = useGraphQLArray(cartData?.cartItems);
  const [deleteCartItem] = useOrderCartItemDeleteMutation(
    ${expression2}, {
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

    const script1: DraftScript = {
      text: code,
      offset: 0,
    };

    const occurence1: TTExpressionOccurence = {
      content: expression1,
      position: 238,
    };

    const type1 = 'Toto';

    const script2 = updateScriptWithTTOccurence(script1, occurence1, type1);

    expect(formatTS(script2.text)).toEqual(
      formatTS(`
    import React from 'react';
    import { useCartPrice } from 'web-client/components/organisms/cart/hooks/UseCartPrice';

    export const CartList: React.FC = () => {
      const { t } = useTranslate();
      const { data: cartData, loading } = useQuery(${expression1.slice(
        0,
        expression1.length - type1.length - 5
      )}\` as ${type1});
      const cartItems = useGraphQLArray(cartData?.cartItems);
      const [deleteCartItem] = useOrderCartItemDeleteMutation(
        ${expression2}, {
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
        `)
    );

    expect(script2.offset).toEqual(0);

    const occurence2: TTExpressionOccurence = {
      content: expression2,
      position: 526,
    };

    const type2 = 'Bar';

    const script3 = updateScriptWithTTOccurence(script2, occurence2, type2);

    expect(formatTS(script3.text)).toEqual(
      formatTS(`
    import React from 'react';
    import { useCartPrice } from 'web-client/components/organisms/cart/hooks/UseCartPrice';

    export const CartList: React.FC = () => {
      const { t } = useTranslate();
      const { data: cartData, loading } = useQuery(${expression1.slice(
        0,
        expression1.length - type1.length - 5
      )}\` as ${type1});
      const cartItems = useGraphQLArray(cartData?.cartItems);
      const [deleteCartItem] = useOrderCartItemDeleteMutation(
        ${expression2.slice(
          0,
          expression2.length - type2.length - 5
        )}\` as ${type2}, {
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
        `)
    );

    expect(script3.offset).toEqual(0);
  });
});
